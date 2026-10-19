
from fastapi.testclient import TestClient
from app.main import app
from unittest.mock import patch

client = TestClient(app)


def test_home():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "message": "Welcome to ApiPulse!",
        "status": "running"
    }


def test_get_targets():
    response = client.get("/target/")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_target():
    response = client.post(
        "/target/",
        json={
            "name": "Test API",
            "url": "https://example.com"
        }
    )

    assert response.status_code == 201

    data = response.json()

    assert data["name"] == "Test API"
    assert data["url"].rstrip("/") == "https://example.com"


def test_target_not_found():
    response = client.get("/target/999999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Target not found"}


def test_run_target_check():
    fake_result = {
        "url": "https://example.com/",
        "status_code": 200,
        "response_time_ms": 120.0,
        "is_healthy": True,
        "error": None
    }

    with patch("app.router.targets.check_api", return_value=fake_result):
        response = client.post("/target/1/check")

    assert response.status_code == 200

    data = response.json()

    assert data["is_healthy"] is True
    assert data["status_code"] == 200
    assert data["target_id"] == 1
