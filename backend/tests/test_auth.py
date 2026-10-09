from __future__ import annotations

from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app


def setup_function() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_register_login_me_logout() -> None:
    with TestClient(app) as client:
        registered = client.post(
            "/api/auth/register",
            json={"username": "tester", "password": "safety123", "display_name": "测试人员"},
        )
        assert registered.status_code == 201
        assert registered.json()["username"] == "tester"

        duplicate = client.post(
            "/api/auth/register",
            json={"username": "tester", "password": "safety123"},
        )
        assert duplicate.status_code == 409

        login = client.post("/api/auth/login", json={"username": "tester", "password": "safety123"})
        assert login.status_code == 200
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        assert client.get("/api/auth/me", headers=headers).json()["display_name"] == "测试人员"
        avatar = "data:image/jpeg;base64,dGVzdA=="
        updated = client.patch("/api/auth/profile", headers=headers, json={"avatar_data": avatar})
        assert updated.status_code == 200
        assert updated.json()["avatar_data"] == avatar
        assert client.get("/api/auth/me", headers=headers).json()["avatar_data"] == avatar
        assert client.post("/api/auth/logout", headers=headers).status_code == 200
        assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_invalid_password_is_rejected() -> None:
    with TestClient(app) as client:
        client.post("/api/auth/register", json={"username": "operator", "password": "safety123"})
        response = client.post("/api/auth/login", json={"username": "operator", "password": "wrong"})
        assert response.status_code == 401


def test_role_is_saved_and_checked_during_login() -> None:
    with TestClient(app) as client:
        registered = client.post(
            "/api/auth/register",
            json={"username": "safety", "password": "safety123", "role": "safety_manager"},
        )
        assert registered.status_code == 201
        assert registered.json()["role"] == "safety_manager"

        wrong_role = client.post(
            "/api/auth/login",
            json={"username": "safety", "password": "safety123", "role": "ordinary"},
        )
        assert wrong_role.status_code == 403

        login = client.post(
            "/api/auth/login",
            json={"username": "safety", "password": "safety123", "role": "safety_manager"},
        )
        assert login.status_code == 200
