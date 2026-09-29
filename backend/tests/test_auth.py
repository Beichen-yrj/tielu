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
        assert client.post("/api/auth/logout", headers=headers).status_code == 200
        assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_invalid_password_is_rejected() -> None:
    with TestClient(app) as client:
        client.post("/api/auth/register", json={"username": "operator", "password": "safety123"})
        response = client.post("/api/auth/login", json={"username": "operator", "password": "wrong"})
        assert response.status_code == 401
