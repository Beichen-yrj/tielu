from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import HazardAssessment
from test_hazard_assessments import login_as, payload

PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJ1sAAAAASUVORK5CYII="


@pytest.fixture
def workflow():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as client:
        owner = login_as(client, "original-assessor", "safety_manager")
        manager = login_as(client, "assigned-manager", "project_manager")
        saved = client.put("/api/hazard-assessments/HA-1001", json=payload(), headers=owner)
        assert saved.status_code == 200
        yield client, owner, manager


def patch(client, headers, state, operation, version, **extra):
    return client.patch("/api/hazard-assessments/HA-1001/rectification", headers=headers, json={
        "status": state, "operation": operation, "expected_version": version, "note": "本次真实处理进展", **extra,
    })


def start_review(client, owner, manager):
    assert patch(client, manager, "整改中", "advance", 0).status_code == 200
    assert patch(client, manager, "待复核", "advance", 1).status_code == 200
    assert patch(client, owner, "复核中", "advance", 2).status_code == 200


def review_evidence():
    return {"review_result": "合格", "review_measured_value": "8", "review_standard_value": "≤10%LEL", "rectification_photo_data": PHOTO, "rectification_photo_name": "review.png"}


def test_complete_flow_persists_discovery_progress_review_and_closure(workflow):
    client, owner, manager = workflow
    initial = client.get("/api/hazard-assessments", headers=owner).json()[0]
    assert initial["status"] == "待整改"
    assert initial["rectification_log"][0]["actor_id"] == initial["user_id"]
    assert initial["rectification_log"][0]["note"] == payload()["finding"]
    saved = patch(client, manager, "待整改", "save_progress", 0, note="已落实临时隔离措施")
    assert saved.status_code == 200
    assert saved.json()["status"] == "待整改"
    assert saved.json()["rectification_log"][0]["note"] == "已落实临时隔离措施"
    for version, headers, state in [(1, manager, "整改中"), (2, manager, "待复核"), (3, owner, "复核中")]:
        assert patch(client, headers, state, "advance", version).status_code == 200
    reviewed = patch(client, owner, "待项目经理确认", "advance", 4, **review_evidence())
    assert reviewed.status_code == 200
    assert reviewed.json()["review_result"] == "合格"
    assert reviewed.json()["rectification_photo_data"] == PHOTO
    assert patch(client, owner, "已闭环", "advance", 5).status_code == 403
    finished = patch(client, manager, "已闭环", "advance", 5)
    assert finished.status_code == 200
    persisted = client.get("/api/hazard-assessments", headers=manager).json()[0]
    assert persisted["status"] == "已闭环"
    assert len(persisted["rectification_log"]) == 7
    assert persisted["rectification_log"][1]["photo_data"] == PHOTO
    assert persisted["score"] == payload()["score"]
    assert persisted["measured_value"] == payload()["measured_value"]
    assert persisted["photo_data"] == payload()["photo_data"]
    assert patch(client, manager, "已闭环", "save_progress", 6).status_code == 403


def test_current_operator_can_edit_own_current_stage_record_without_advancing(workflow):
    client, owner, manager = workflow
    started = patch(client, manager, "整改中", "advance", 0, note="首次整改说明")
    assert started.status_code == 200
    event_id = started.json()["rectification_log"][0]["id"]
    edited = client.patch("/api/hazard-assessments/HA-1001/rectification", headers=manager, json={
        "status": "整改中", "operation": "edit", "edit_event_id": event_id,
        "expected_version": 1, "note": "修改后的整改说明",
    })
    assert edited.status_code == 200
    body = edited.json()
    assert body["status"] == "整改中"
    assert body["workflow_version"] == 2
    assert body["rectification_log"][0]["operation"] == "edit"
    assert body["rectification_log"][0]["note"] == "修改后的整改说明"
    assert body["rectification_log"][0]["edited_event_id"] == event_id
    assert body["rectification_log"][1]["note"] == "首次整改说明"
    denied = client.patch("/api/hazard-assessments/HA-1001/rectification", headers=owner, json={
        "status": "整改中", "operation": "edit", "edit_event_id": event_id,
        "expected_version": 2, "note": "越权修改",
    })
    assert denied.status_code == 403


def test_edit_locks_old_records_and_rejects_stage_changes_and_stale_versions(workflow):
    client, owner, manager = workflow
    started = patch(client, manager, "整改中", "advance", 0)
    original_id = started.json()["rectification_log"][0]["id"]
    saved = patch(client, manager, "整改中", "save_progress", 1)
    latest_id = saved.json()["rectification_log"][0]["id"]
    assert patch(client, manager, "整改中", "edit", 2, edit_event_id=original_id).status_code == 403
    assert patch(client, manager, "待复核", "edit", 2, edit_event_id=latest_id).status_code == 409
    assert patch(client, manager, "整改中", "edit", 1, edit_event_id=latest_id).status_code == 409
    assert patch(client, manager, "整改中", "edit", 2, edit_event_id="missing").status_code == 403
    assert patch(client, manager, "整改中", "edit", 2, edit_event_id="assessment-HA-1001").status_code == 403
    amended = patch(client, manager, "整改中", "edit", 2, edit_event_id=latest_id, note="更正说明")
    assert amended.status_code == 200
    amendment_id = amended.json()["rectification_log"][0]["id"]
    assert patch(client, manager, "整改中", "edit", 3, edit_event_id=amendment_id, note="再次更正说明").status_code == 200
    assert patch(client, manager, "待复核", "advance", 4).status_code == 200
    assert patch(client, manager, "待复核", "edit", 5, edit_event_id=amendment_id).status_code == 403


def test_review_edits_preserve_audit_and_require_valid_passed_evidence(workflow):
    client, owner, manager = workflow
    start_review(client, owner, manager)
    started = client.get("/api/hazard-assessments", headers=owner).json()[0]
    event_id = started["rectification_log"][0]["id"]
    # The start-of-review note is editable even before measurements are ready.
    draft = patch(client, owner, "复核中", "edit", 3, edit_event_id=event_id, note="准备复核检测")
    assert draft.status_code == 200
    draft_id = draft.json()["rectification_log"][0]["id"]
    evidence = review_evidence()
    assert patch(client, owner, "复核中", "edit", 4, edit_event_id=draft_id, **{**evidence, "review_measured_value": "18"}).status_code == 422
    assert patch(client, owner, "复核中", "edit", 4, edit_event_id=draft_id, **{**evidence, "rectification_photo_data": ""}).status_code == 422
    valid = patch(client, owner, "复核中", "edit", 4, edit_event_id=draft_id, **evidence)
    assert valid.status_code == 200
    assert valid.json()["review_measured_value"] == "8"
    assert valid.json()["rectification_photo_data"] == PHOTO
    assert valid.json()["rectification_log"][1]["note"] == "准备复核检测"
    assert patch(client, owner, "待项目经理确认", "advance", 5, **evidence).status_code == 200
    submitted = client.get("/api/hazard-assessments", headers=owner).json()[0]
    submitted_id = submitted["rectification_log"][0]["id"]
    assert patch(client, owner, "待项目经理确认", "edit", 6, edit_event_id=submitted_id, **evidence).status_code == 403
    assert patch(client, manager, "已闭环", "advance", 6).status_code == 200
    closed = client.get("/api/hazard-assessments", headers=manager).json()[0]
    assert patch(client, manager, "已闭环", "edit", 7, edit_event_id=closed["rectification_log"][0]["id"]).status_code == 409


def test_safety_manager_can_review_and_original_manager_can_confirm(workflow):
    client, owner, manager = workflow
    other = login_as(client, "other-assessor", "safety_manager")
    other_manager = login_as(client, "other-manager", "project_manager")
    assert patch(client, owner, "整改中", "advance", 0).status_code == 403
    assert patch(client, manager, "整改中", "advance", 0).status_code == 200
    assert patch(client, other_manager, "待复核", "advance", 1).status_code == 403
    assert patch(client, manager, "待复核", "advance", 1).status_code == 200
    assert patch(client, manager, "复核中", "advance", 2).status_code == 403
    assert patch(client, other, "复核中", "advance", 2).status_code == 200
    assert patch(client, other, "待项目经理确认", "advance", 3, **review_evidence()).status_code == 200
    assert patch(client, other_manager, "已闭环", "advance", 4).status_code == 403
    assert patch(client, manager, "已闭环", "advance", 4).status_code == 200


@pytest.mark.parametrize("changes", [
    {"rectification_photo_data": ""}, {"review_result": "不合格"}, {"review_measured_value": ""},
    {"review_standard_value": ""}, {"review_measured_value": "18"}, {"review_standard_value": "≤100%LEL"},
    {"rectification_photo_data": "not-a-photo"}, {"review_measured_value": "8 ppm"},
])
def test_incomplete_or_out_of_limit_review_cannot_be_submitted(workflow, changes):
    client, owner, manager = workflow
    start_review(client, owner, manager)
    evidence = {**review_evidence(), **changes}
    assert patch(client, owner, "待项目经理确认", "advance", 3, **evidence).status_code == 422
    item = client.get("/api/hazard-assessments", headers=owner).json()[0]
    assert item["status"] == "复核中"
    assert item["workflow_version"] == 3


def test_withdrawal_clears_passed_review_but_preserves_evidence_history(workflow):
    client, owner, manager = workflow
    start_review(client, owner, manager)
    assert patch(client, owner, "待项目经理确认", "advance", 3, **review_evidence()).status_code == 200
    assert patch(client, manager, "复核中", "withdraw", 4).status_code == 403
    withdrawn = patch(client, owner, "复核中", "withdraw", 4, note="误触提交，重新现场核对")
    assert withdrawn.status_code == 200
    assert withdrawn.json()["review_result"] == ""
    assert withdrawn.json()["rectification_photo_data"] == ""
    assert withdrawn.json()["rectification_log"][1]["photo_data"] == PHOTO
    assert patch(client, owner, "待项目经理确认", "advance", 5).status_code == 422
    assert patch(client, owner, "整改中", "reject", 5, note="复核不合格，重新整改").status_code == 200
    assert patch(client, manager, "待复核", "advance", 6).status_code == 200
    assert patch(client, owner, "复核中", "advance", 7).status_code == 200
    assert patch(client, owner, "待项目经理确认", "advance", 8, **review_evidence()).status_code == 200
    assert patch(client, manager, "已闭环", "advance", 9).status_code == 200
    assert patch(client, manager, "待项目经理确认", "withdraw", 10).status_code == 200


def test_stale_request_empty_note_jump_and_legacy_write_are_rejected(workflow):
    client, owner, manager = workflow
    for operation, target in [("advance", "待复核"), ("save_progress", "整改中"), ("withdraw", "已闭环")]:
        assert patch(client, manager, target, operation, 0).status_code == 409
    assert patch(client, manager, "整改中", "advance", 0, note="   ").status_code == 422
    assert client.patch("/api/hazard-assessments/HA-1001/rectification", headers=manager, json={"status": "待复核"}).status_code == 422
    assert patch(client, manager, "整改中", "advance", 0).status_code == 200
    assert patch(client, manager, "待复核", "advance", 0).status_code == 409
    overwrite = {**payload(), "status": "整改中", "rectification_log": []}
    assert client.put("/api/hazard-assessments/HA-1001", json=overwrite, headers=owner).status_code == 409
    assert patch(client, manager, "待整改", "withdraw", 1).status_code == 200
    assert patch(client, manager, "整改中", "advance", 2).status_code == 200


def test_original_assessment_write_cannot_skip_workflow(workflow):
    client, owner, _manager = workflow
    data = {**payload(), "status": "已闭环"}
    assert client.put("/api/hazard-assessments/HA-1001", json=data, headers=owner).status_code == 409
    data["id"] = "HA-forged"
    assert client.put("/api/hazard-assessments/HA-forged", json=data, headers=owner).status_code == 422


def test_legacy_record_gets_discovery_and_requires_new_review_evidence(workflow):
    client, owner, manager = workflow
    with SessionLocal() as db:
        item = db.scalar(select(HazardAssessment))
        item.status = "复核中"
        item.rectification_log = None
        db.commit()
    listed = client.get("/api/hazard-assessments", headers=owner)
    assert listed.status_code == 200
    assert listed.json()[0]["rectification_log"][0]["operation"] == "assessment"
    assert patch(client, manager, "已闭环", "advance", 0).status_code == 403
    assert patch(client, owner, "待项目经理确认", "advance", 0, **review_evidence()).status_code == 200
