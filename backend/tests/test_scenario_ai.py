"""No provider calls or production database writes occur in these tests."""
import json
from types import SimpleNamespace

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app import scenario_ai as ai
from app.auth import get_current_user
from app.database import get_db


def client_for(monkeypatch, answer=None, record=None, key="test-only"):
    app = FastAPI()
    app.include_router(ai.router)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(role="safety_manager")
    app.dependency_overrides[get_db] = lambda: SimpleNamespace(get=lambda *args: record)
    monkeypatch.setattr(ai, "get_settings", lambda: SimpleNamespace(deepseek_api_key=key, deepseek_base_url="https://example.invalid", deepseek_model="test-model"))
    sent = []

    class MockClient:
        def __init__(self, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, url, **kwargs):
            sent.append(kwargs["json"])
            return httpx.Response(200, request=httpx.Request("POST", url), json={"choices": [{"message": {"content": json.dumps(answer or {
                "summary": "合成评估建议", "zone": "Z02", "event": "leak", "material": "flammable_liquid",
                "reasons": ["按原指标核查连接"], "missing": ["现场风况"], "actions": ["按原措施复核"],
            })}}]})

    monkeypatch.setattr(ai.httpx, "AsyncClient", MockClient)
    return TestClient(app), sent


def test_plan_auth_and_missing_service(monkeypatch):
    client, sent = client_for(monkeypatch, key="")
    assert client.get("/api/ai/scenario-status").json()["configured"] is False
    assert client.post("/api/ai/scenario-plan", json={"problem": "连接泄漏"}).status_code == 503
    assert not sent
    client.app.dependency_overrides.clear()
    assert client.post("/api/ai/scenario-plan", json={"problem": "连接泄漏"}).status_code == 401


def test_structured_suggestion_and_extra_fields(monkeypatch):
    client, sent = client_for(monkeypatch)
    result = client.post("/api/ai/scenario-plan", json={"problem": "连接泄漏"})
    assert result.status_code == 200
    assert result.json()["origin"] == "deepseek"
    assert "不生成代码" in sent[0]["messages"][0]["content"]
    assert client.post("/api/ai/scenario-plan", json={"problem": "泄漏", "role": "admin"}).status_code == 422


def test_server_reads_actual_source_and_rejects_stale_version(monkeypatch):
    fields = ["hazard_code", "hazard_name", "stage", "dimension", "cargo", "un_number", "risk", "status", "finding", "action", "basis", "data_name", "measured_value", "unit", "standard_value", "has_hazard"]
    record = SimpleNamespace(**{k: "原记录" for k in fields}, workflow_version=4)
    client, sent = client_for(monkeypatch, record=record)
    body = {"source_id": "TEST-SOURCE", "source_version": "3", "problem": "客户端假设", "cargo": "客户端货物"}
    assert client.post("/api/ai/scenario-plan", json=body).status_code == 409
    assert not sent
    body["source_version"] = "4"
    assert client.post("/api/ai/scenario-plan", json=body).status_code == 200
    context = json.loads(sent[0]["messages"][1]["content"])
    assert context["cargo"] == "原记录"
    assert context["platform_record"]["measured_value"] == "原记录"


@pytest.mark.parametrize("answer", [
    {"summary": "x", "zone": "Z99", "event": "fire", "material": "toxic_gas", "reasons": ["x"], "actions": ["x"], "missing": []},
    {"summary": "x", "zone": "Z02", "event": "fire", "material": "toxic_gas", "reasons": ["x"], "actions": ["x"], "missing": []},
    {"summary": "x", "zone": "Z02", "event": "leak", "material": "unknown", "reasons": ["x"], "actions": ["x"], "missing": [], "code": "evil()"},
])
def test_invalid_ai_data_is_never_applied(monkeypatch, answer):
    client, _ = client_for(monkeypatch, answer=answer)
    assert client.post("/api/ai/scenario-plan", json={"problem": "合成测试"}).status_code == 502
