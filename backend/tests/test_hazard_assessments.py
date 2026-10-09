from __future__ import annotations

from fastapi.testclient import TestClient
import pytest

from app.database import Base, engine
from app.config import get_settings
from app.main import app


def setup_function() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def login_as(client: TestClient, username: str, role: str) -> dict[str, str]:
    client.post("/api/auth/register", json={"username": username, "password": "safety123", "role": role})
    response = client.post("/api/auth/login", json={"username": username, "password": "safety123", "role": role})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def payload() -> dict[str, object]:
    return {
        "id": "HA-1001", "task_name": "装卸线检测", "bureau": "中国铁路北京局集团有限公司", "station": "丰台西站", "area": "3号装卸线",
        "cargo": "航空煤油", "un_number": "UN1863", "inspector": "安全员", "hazard_code": "HZ-022",
        "stage": "装卸", "dimension": "物", "hazard_name": "有毒气体检测报警仪",
        "basis": "铁运〔2010〕105号 12.1.1", "assessment_type": "动态", "data_name": "可燃气体浓度",
        "measured_value": "18", "unit": "%LEL", "standard_value": "≤10%LEL", "static_result": "",
        "likelihood": 4, "severity": 4, "score": 16, "risk": "重大", "has_hazard": True,
        "finding": "检测值超过控制阈值", "action": "停止作业并排查泄漏源", "photo_name": "evidence.jpg",
        "photo_data": "data:image/jpeg;base64,AA==", "status": "已完成", "created_at": "2026/10/07 10:00:00",
    }


def test_safety_manager_can_save_and_list_assessment() -> None:
    with TestClient(app) as client:
        headers = login_as(client, "assessor", "safety_manager")
        saved = client.put("/api/hazard-assessments/HA-1001", json=payload(), headers=headers)
        assert saved.status_code == 200
        assert saved.json()["bureau"] == "中国铁路北京局集团有限公司"
        assert saved.json()["risk"] == "重大"
        listed = client.get("/api/hazard-assessments", headers=headers)
        assert listed.status_code == 200
        assert listed.json()[0]["bureau"] == "中国铁路北京局集团有限公司"
        assert listed.json()[0]["hazard_name"] == "有毒气体检测报警仪"


def test_project_manager_and_ordinary_user_can_read_but_cannot_write() -> None:
    with TestClient(app) as client:
        assessor_headers = login_as(client, "assessor", "safety_manager")
        assert client.put("/api/hazard-assessments/HA-1001", json=payload(), headers=assessor_headers).status_code == 200
        for username, role in (("project-user", "project_manager"), ("ordinary-user", "ordinary")):
            headers = login_as(client, username, role)
            listed = client.get("/api/hazard-assessments", headers=headers)
            assert listed.status_code == 200
            assert [item["id"] for item in listed.json()] == ["HA-1001"]
            assert client.put("/api/hazard-assessments/HA-1001", json=payload(), headers=headers).status_code == 403
            assert client.delete("/api/hazard-assessments/HA-1001", headers=headers).status_code == 403


def test_owner_can_delete_assessment() -> None:
    with TestClient(app) as client:
        headers = login_as(client, "delete-assessor", "safety_manager")
        assert client.put("/api/hazard-assessments/HA-1001", json=payload(), headers=headers).status_code == 200
        deleted = client.delete("/api/hazard-assessments/HA-1001", headers=headers)
        assert deleted.status_code == 200
        assert deleted.json() == {"deleted": True}
        assert client.get("/api/hazard-assessments", headers=headers).json() == []


@pytest.mark.parametrize("role", ["ordinary", "safety_manager"])
def test_non_rectifiers_cannot_change_rectification_status(role: str) -> None:
    with TestClient(app) as client:
        owner = login_as(client, "owner", "safety_manager")
        assert client.put("/api/hazard-assessments/HA-1001", json=payload(), headers=owner).status_code == 200
        headers = login_as(client, "viewer", role)
        denied = client.patch("/api/hazard-assessments/HA-1001/rectification", json={"status": "整改中", "operation": "advance", "expected_version": 0, "note": "尝试越权"}, headers=headers)
        assert denied.status_code == 403
        record = client.get("/api/hazard-assessments", headers=owner).json()[0]
        assert record["status"] == "待整改"


def test_project_manager_can_update_status_without_changing_assessment_data() -> None:
    with TestClient(app) as client:
        owner = login_as(client, "owner", "safety_manager")
        client.put("/api/hazard-assessments/HA-1001", json=payload(), headers=owner)
        headers = login_as(client, "manager", "project_manager")
        for body in ({"status": "已闭环"}, {"status": "待复核", "score": 1}):
            assert client.patch("/api/hazard-assessments/HA-1001/rectification", json=body, headers=headers).status_code in {409, 422}
        for version, stage in enumerate(("整改中", "待复核")):
            updated = client.patch("/api/hazard-assessments/HA-1001/rectification", json={"status": stage, "operation": "advance", "expected_version": version, "note": "整改进展"}, headers=headers)
            assert updated.status_code == 200
            assert updated.json()["status"] == stage
            assert updated.json()["score"] == 16
            assert updated.json()["photo_data"] == payload()["photo_data"]
        assert client.patch("/api/hazard-assessments/HA-1001/rectification", json={"status": "复核中", "operation": "advance", "expected_version": 2, "note": "冒充复核"}, headers=headers).status_code == 403
        assert client.patch("/api/hazard-assessments/HA-missing/rectification", json={"status": "整改中", "operation": "advance", "expected_version": 0, "note": "不存在的任务"}, headers=headers).status_code == 404


def test_any_safety_manager_can_submit_review_evidence() -> None:
    with TestClient(app) as client:
        owner = login_as(client, "review-owner", "safety_manager")
        client.put("/api/hazard-assessments/HA-1001", json=payload(), headers=owner)
        manager = login_as(client, "review-manager", "project_manager")
        assert client.patch("/api/hazard-assessments/HA-1001/rectification", json={"status": "整改中", "operation": "advance", "expected_version": 0, "note": "整改进展"}, headers=manager).status_code == 200
        assert client.patch("/api/hazard-assessments/HA-1001/rectification", json={"status": "待复核", "operation": "advance", "expected_version": 1, "note": "提交复核"}, headers=manager).status_code == 200
        other_safety_manager = login_as(client, "review-other-safety-manager", "safety_manager")
        assert client.patch("/api/hazard-assessments/HA-1001/rectification", json={"status": "复核中", "operation": "advance", "expected_version": 2, "note": "开始现场复核"}, headers=other_safety_manager).status_code == 200
        evidence = {
            "status": "待项目经理确认", "operation": "advance", "expected_version": 3, "note": "复核合格",
            "review_result": "合格", "review_measured_value": "8", "review_standard_value": "≤10%LEL",
            "rectification_photo_name": "review.png", "rectification_photo_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJ1sAAAAASUVORK5CYII=",
        }
        reviewed = client.patch("/api/hazard-assessments/HA-1001/rectification", json=evidence, headers=other_safety_manager)
        assert reviewed.status_code == 200
        assert reviewed.json()["review_result"] == "合格"


@pytest.mark.parametrize("role", ["project_manager", "ordinary"])
def test_legacy_assessment_api_also_rejects_non_assessors(role: str) -> None:
    with TestClient(app) as client:
        headers = login_as(client, "viewer", role)
        legacy_payload = {
            "id": "AS-1001", "name": "测试评估", "station": "丰台西站", "area": "装卸线", "cargo": "煤油",
            "detector": "测试人员", "temperature": 20, "pressure": 1, "concentration": 0,
            "static_checks": [True], "likelihood": 1, "severity": 1, "risk": "低", "score": 1,
            "status": "已完成", "findings": [], "measures": [], "created_at": "2026/10/08 10:00:00",
        }
        assert client.get("/api/assessments", headers=headers).status_code == 403
        assert client.put("/api/assessments/AS-1001", json=legacy_payload, headers=headers).status_code == 403


def test_unauthenticated_requests_are_rejected() -> None:
    with TestClient(app) as client:
        assert client.get("/api/hazard-assessments").status_code == 401
        assert client.put("/api/hazard-assessments/HA-1001", json=payload()).status_code == 401
        assert client.delete("/api/hazard-assessments/HA-1001").status_code == 401
        assert client.patch("/api/hazard-assessments/HA-1001/rectification", json={"status": "待复核"}).status_code == 401


def test_other_assessor_cannot_overwrite_or_delete_owner_record() -> None:
    with TestClient(app) as client:
        owner = login_as(client, "owner", "safety_manager")
        client.put("/api/hazard-assessments/HA-1001", json=payload(), headers=owner)
        other = login_as(client, "other-assessor", "safety_manager")
        assert client.put("/api/hazard-assessments/HA-1001", json=payload(), headers=other).status_code == 404
        assert client.delete("/api/hazard-assessments/HA-1001", headers=other).status_code == 404
        assert client.get("/api/hazard-assessments", headers=owner).json()[0]["id"] == "HA-1001"


def test_admin_retains_assessment_and_rectification_permissions() -> None:
    with TestClient(app) as client:
        settings = get_settings()
        logged_in = client.post("/api/auth/login", json={"username": settings.admin_username, "password": settings.admin_password})
        headers = {"Authorization": f"Bearer {logged_in.json()['access_token']}"}
        assert client.put("/api/hazard-assessments/HA-1001", json=payload(), headers=headers).status_code == 200
        assert client.patch("/api/hazard-assessments/HA-1001/rectification", json={"status": "整改中", "operation": "advance", "expected_version": 0, "note": "开始整改"}, headers=headers).status_code == 200
        assert client.delete("/api/hazard-assessments/HA-1001", headers=headers).status_code == 200
