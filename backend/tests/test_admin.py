from __future__ import annotations

from fastapi.testclient import TestClient
from types import SimpleNamespace
import httpx
import json
import pytest

from app import ai, admin
from app.database import Base, engine
from app.main import app


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def login(client: TestClient, username: str, password: str) -> tuple[dict[str, str], int]:
    response = client.post("/api/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200, response.text
    payload = response.json()
    return {"Authorization": f"Bearer {payload['access_token']}"}, payload["user"]["id"]


def test_admin_only_endpoints_reject_ordinary_users() -> None:
    with TestClient(app) as client:
        registered = client.post("/api/auth/register", json={"username": "ordinary", "password": "ordinary123"})
        assert registered.status_code == 201
        headers, _ = login(client, "ordinary", "ordinary123")

        assert client.get("/api/admin/users", headers=headers).status_code == 403
        assert client.get("/api/admin/ai-config", headers=headers).status_code == 403
        assert client.get("/api/admin/users").status_code == 401
        assert client.put("/api/admin/ai-config", headers=headers, json={"api_key": "denied"}).status_code == 403
        assert client.post("/api/admin/users", headers=headers, json={"username": "denied", "display_name": "测试账号", "password": "password123", "role": "admin"}).status_code == 403
        assert client.patch(f"/api/admin/users/{registered.json()['id']}", headers=headers, json={"role": "admin"}).status_code == 403
        assert client.post(f"/api/admin/users/{registered.json()['id']}/reset-password", headers=headers, json={"new_password": "password123"}).status_code == 403


def test_admin_can_manage_accounts_and_revoke_sessions() -> None:
    with TestClient(app) as client:
        admin_headers, admin_id = login(client, "admin", "admin123456")
        created = client.post(
            "/api/admin/users",
            headers=admin_headers,
            json={"username": "new-user", "display_name": "新用户", "password": "new-user123", "role": "ordinary"},
        )
        assert created.status_code == 201
        assert "password_hash" not in created.json()
        user_id = created.json()["id"]
        assert any(user["id"] == user_id for user in client.get("/api/admin/users", headers=admin_headers).json())
        assert client.post("/api/admin/users", headers=admin_headers, json={"username": "new-user", "display_name": "新用户", "password": "new-user123"}).status_code == 409

        before_role_headers, _ = login(client, "new-user", "new-user123")
        updated = client.patch(
            f"/api/admin/users/{user_id}",
            headers=admin_headers,
            json={"role": "project_manager"},
        )
        assert updated.status_code == 200
        assert updated.json()["role"] == "project_manager"
        assert client.get("/api/auth/me", headers=before_role_headers).status_code == 401

        user_headers, _ = login(client, "new-user", "new-user123")
        disabled = client.patch(f"/api/admin/users/{user_id}", headers=admin_headers, json={"is_active": False})
        assert disabled.status_code == 200
        assert client.get("/api/auth/me", headers=user_headers).status_code == 401

        reenabled = client.patch(f"/api/admin/users/{user_id}", headers=admin_headers, json={"is_active": True})
        assert reenabled.status_code == 200
        old_headers, _ = login(client, "new-user", "new-user123")
        reset = client.post(
            f"/api/admin/users/{user_id}/reset-password",
            headers=admin_headers,
            json={"new_password": "reset-user123"},
        )
        assert reset.status_code == 200
        assert client.get("/api/auth/me", headers=old_headers).status_code == 401
        assert client.post("/api/auth/login", json={"username": "new-user", "password": "new-user123"}).status_code == 401
        assert login(client, "new-user", "reset-user123")[1] == user_id

        cannot_disable_self = client.patch(f"/api/admin/users/{admin_id}", headers=admin_headers, json={"is_active": False})
        assert cannot_disable_self.status_code == 400
        assert client.patch(f"/api/admin/users/{admin_id}", headers=admin_headers, json={"role": "ordinary"}).status_code == 400


def test_global_ai_config_is_masked_and_visible_to_all_ai_users(monkeypatch) -> None:
    settings = SimpleNamespace(deepseek_api_key="old-environment-key", deepseek_base_url="https://env.invalid", deepseek_model="env-model")
    monkeypatch.setattr(admin, "get_settings", lambda: settings)
    sent = []

    class MockClient:
        def __init__(self, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, url, **kwargs):
            sent.append((url, kwargs))
            content = json.dumps({"summary": "测试建议", "zone": "Z02", "event": "control", "material": "unknown", "reasons": ["待核查"], "missing": [], "actions": ["复核记录"]}) if "response_format" in kwargs["json"] else "测试建议"
            return httpx.Response(200, request=httpx.Request("POST", url), json={"choices": [{"message": {"content": content}}]})

    monkeypatch.setattr(ai.httpx, "AsyncClient", MockClient)
    with TestClient(app) as client:
        admin_headers, _ = login(client, "admin", "admin123456")
        saved = client.put(
            "/api/admin/ai-config",
            headers=admin_headers,
            json={"api_key": "sk-platform-secret", "base_url": "https://example.invalid", "model": "rail-model"},
        )
        assert saved.status_code == 200
        assert saved.json()["configured"] is True
        assert "sk-platform-secret" not in saved.text
        assert saved.json()["api_key_masked"] == "sk-p••••cret"
        loaded = client.get("/api/admin/ai-config", headers=admin_headers)
        assert "sk-platform-secret" not in loaded.text

        ordinary = client.post("/api/auth/register", json={"username": "ai-user", "password": "ai-user123"})
        assert ordinary.status_code == 201
        user_headers, _ = login(client, "ai-user", "ai-user123")
        status = client.get("/api/ai/scenario-status", headers=user_headers)
        assert status.status_code == 200
        assert status.json() == {"configured": True, "provider": "deepseek", "model": "rail-model"}
        chat = client.post("/api/ai/chat", headers=user_headers, json={"question": "给出建议", "context": {"assessment_count": 0, "open_issue_count": 0, "major_issue_count": 0}})
        assert chat.status_code == 200
        assert chat.json()["model"] == "rail-model"
        assert sent[0][0] == "https://example.invalid/chat/completions"
        assert sent[0][1]["headers"]["Authorization"] == "Bearer sk-platform-secret"
        assert sent[0][1]["json"]["model"] == "rail-model"
        scenario = client.post("/api/ai/scenario-plan", headers=user_headers, json={"problem": "核查装卸记录"})
        assert scenario.status_code == 200
        assert scenario.json()["model"] == "rail-model"
        assert sent[1][0] == "https://example.invalid/chat/completions"
        assert sent[1][1]["headers"]["Authorization"] == "Bearer sk-platform-secret"
        preserved = client.put("/api/admin/ai-config", headers=admin_headers, json={"model": "rail-model-2"})
        assert preserved.status_code == 200
        assert preserved.json()["api_key_masked"] == "sk-p••••cret"

        cleared = client.put("/api/admin/ai-config", headers=admin_headers, json={"clear_api_key": True})
        assert cleared.status_code == 200
        assert cleared.json()["configured"] is False
        assert client.get("/api/ai/scenario-status", headers=user_headers).json()["configured"] is False
        assert client.post("/api/ai/chat", headers=user_headers, json={"question": "给出建议", "context": {"assessment_count": 0, "open_issue_count": 0, "major_issue_count": 0}}).status_code == 503
        assert client.post("/api/ai/scenario-plan", headers=user_headers, json={"problem": "核查装卸记录"}).status_code == 503
        assert len(sent) == 2


@pytest.mark.parametrize("payload", [
    {"base_url": "file:///tmp/service"},
    {"base_url": "https://example.invalid?api_key=secret"},
    {"base_url": "https://user:password@example.invalid"},
    {"base_url": "https://example.invalid:bad-port"},
    {"api_key": "bad\r\nkey"},
])
def test_invalid_api_config_does_not_overwrite_saved_values(payload):
    with TestClient(app) as client:
        headers, _ = login(client, "admin", "admin123456")
        saved = client.put("/api/admin/ai-config", headers=headers, json={"api_key": "valid-test-key", "base_url": "https://example.invalid/v1", "model": "test-model"})
        assert saved.status_code == 200
        assert client.put("/api/admin/ai-config", headers=headers, json=payload).status_code == 422
        assert client.get("/api/admin/ai-config", headers=headers).json()["model"] == "test-model"
