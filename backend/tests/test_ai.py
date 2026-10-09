from types import SimpleNamespace

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app import ai
from app.auth import get_current_user


def body():
    return {"question": "给出岗位建议", "context": {
        "assessment_count": 2, "open_issue_count": 1, "major_issue_count": 1,
        "latest_assessment": None,
    }}


@pytest.mark.parametrize("role", ["safety_manager", "project_manager", "ordinary", "admin", "operator"])
def test_ai_uses_authenticated_role_without_real_external_request(monkeypatch, role):
    app = FastAPI()
    app.include_router(ai.router)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(role=role)
    monkeypatch.setattr(ai, "get_settings", lambda: SimpleNamespace(
        deepseek_api_key="test-placeholder", deepseek_model="deepseek-chat",
        deepseek_base_url="https://example.invalid",
    ))
    sent = []

    class MockClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def post(self, url, **kwargs):
            sent.append(kwargs["json"])
            return httpx.Response(200, request=httpx.Request("POST", url), json={
                "choices": [{"message": {"content": "测试辅助建议"}}],
            })

    monkeypatch.setattr(ai.httpx, "AsyncClient", MockClient)
    with TestClient(app) as client:
        response = client.post("/api/ai/chat", json=body())
        assert response.status_code == 200
        assert response.json()["provider"] == "deepseek"
        canonical = "ordinary" if role == "operator" else role
        assert ai.ROLE_GUIDANCE[canonical] in sent[0]["messages"][0]["content"]
        assert "R≥16" in sent[0]["messages"][0]["content"]
        assert "修改账号权限" in sent[0]["messages"][0]["content"]
        spoofed = body()
        spoofed["role"] = "admin"
        assert client.post("/api/ai/chat", json=spoofed).status_code == 422
        spoofed = body()
        spoofed["context"]["role"] = "admin"
        assert client.post("/api/ai/chat", json=spoofed).status_code == 422
        assert len(sent) == 1


def test_ai_unknown_roles_fail_closed_and_unauthenticated_requests_fail():
    app = FastAPI()
    app.include_router(ai.router)
    with TestClient(app) as client:
        assert client.post("/api/ai/chat", json=body()).status_code == 401
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(role="unknown")
        assert client.post("/api/ai/chat", json=body()).status_code == 403


def test_ai_without_key_returns_clear_error(monkeypatch):
    app = FastAPI()
    app.include_router(ai.router)
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(role="ordinary")
    monkeypatch.setattr(ai, "get_settings", lambda: SimpleNamespace(deepseek_api_key=""))
    with TestClient(app) as client:
        response = client.post("/api/ai/chat", json=body())
        assert response.status_code == 503
        assert "DEEPSEEK_API_KEY" in response.json()["detail"]
