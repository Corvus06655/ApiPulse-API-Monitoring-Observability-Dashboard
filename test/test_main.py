import os
from unittest.mock import patch

os.environ.setdefault("SECRET_KEY", "test-only-not-for-production-secret")

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import CheckResult

TEST_ENGINE = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestSessionLocal = sessionmaker(autoflush=False, autocommit=False, bind=TEST_ENGINE)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=TEST_ENGINE)
client = TestClient(app)
TEST_PASSWORD = "TestPassword123!"


def setup_function():
    Base.metadata.drop_all(bind=TEST_ENGINE)
    Base.metadata.create_all(bind=TEST_ENGINE)


def register_and_login(email="test@example.com"):
    response = client.post("/auth/register", json={"email": email, "password": TEST_PASSWORD})
    assert response.status_code == 201, response.text
    login = client.post("/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert login.status_code == 200, login.text
    return {"Authorization": "Bearer " + login.json()["access_token"]}


def create_target(headers, name="Test API", url="https://example.com"):
    response = client.post("/target/", json={"name": name, "url": url}, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


def add_check(target_id, healthy, response_time, status_code=200):
    db = TestSessionLocal()
    try:
        db.add(CheckResult(target_id=target_id, status_code=status_code if healthy else None,
            response_time_ms=response_time, is_healthy=healthy, error=None if healthy else "check failed"))
        db.commit()
    finally:
        db.close()


def test_home():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to ApiPulse!", "status": "running"}


def test_register_login_and_current_user():
    email = "new-user@example.com"
    response = client.post("/auth/register", json={"email": email, "password": TEST_PASSWORD})
    assert response.status_code == 201
    assert response.json()["email"] == email
    assert "hashed_password" not in response.json()
    login = client.post("/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert login.status_code == 200
    assert login.json()["token_type"] == "bearer"
    headers = {"Authorization": "Bearer " + login.json()["access_token"]}
    current = client.get("/auth/me", headers=headers)
    assert current.status_code == 200
    assert current.json()["email"] == email


def test_login_rejects_wrong_password():
    client.post("/auth/register", json={"email": "new-user@example.com", "password": TEST_PASSWORD})
    response = client.post("/auth/login", json={"email": "new-user@example.com", "password": "WrongPassword123!"})
    assert response.status_code == 401


def test_target_routes_require_authentication():
    assert client.get("/target/").status_code == 401
    response = client.post("/target/", json={"name": "Needs auth", "url": "https://example.com"})
    assert response.status_code == 401


def test_users_see_only_their_own_targets():
    alice = register_and_login("alice@example.com")
    bob = register_and_login("bob@example.com")
    item = create_target(alice, name="Alice API")
    assert client.get("/target/", headers=bob).json() == []
    assert client.get("/target/" + str(item["id"]), headers=bob).status_code == 404


def test_get_targets():
    headers = register_and_login()
    create_target(headers)
    response = client.get("/target/", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["name"] == "Test API"


def test_create_target():
    headers = register_and_login()
    response = client.post("/target/", json={"name": "Test API", "url": "https://example.com"}, headers=headers)
    assert response.status_code == 201
    assert response.json()["name"] == "Test API"
    assert response.json()["url"].rstrip("/") == "https://example.com"


def test_target_not_found():
    headers = register_and_login()
    response = client.get("/target/999999", headers=headers)
    assert response.status_code == 404
    assert response.json() == {"detail": "Target not found"}


def test_run_target_check_saves_result():
    headers = register_and_login()
    item = create_target(headers)
    fake = {"url": item["url"], "status_code": 200, "response_time_ms": 120.0,
        "is_healthy": True, "error": None}
    with patch("app.router.targets.check_api", return_value=fake):
        response = client.post("/target/" + str(item["id"]) + "/check", headers=headers)
    assert response.status_code == 200
    assert response.json()["is_healthy"] is True
    history = client.get("/target/" + str(item["id"]) + "/history", headers=headers)
    assert history.status_code == 200
    assert history.json()["total_checks"] == 1


def test_history_only_returns_checks_for_requested_target():
    headers = register_and_login()
    first = create_target(headers, name="First API")
    second = create_target(headers, name="Second API", url="https://example.org")
    add_check(first["id"], True, 100)
    add_check(second["id"], False, 300, status_code=None)
    response = client.get("/target/" + str(first["id"]) + "/history", headers=headers)
    assert response.status_code == 200
    assert response.json()["total_checks"] == 1
    assert all(row["target_id"] == first["id"] for row in response.json()["history"])


def test_stats_calculate_percentage_and_average_correctly():
    headers = register_and_login()
    item = create_target(headers)
    add_check(item["id"], True, 100)
    add_check(item["id"], True, 200)
    add_check(item["id"], False, 300, status_code=None)
    response = client.get("/target/" + str(item["id"]) + "/stats", headers=headers)
    assert response.status_code == 200
    assert response.json() == {
        "target_id": item["id"], "target_name": "Test API", "total_checks": 3,
        "successful_checks": 2, "failed_checks": 1, "uptime_percentage": 66.67,
        "average_response_time_ms": 200.0,
    }


def test_delete_target_also_deletes_history():
    headers = register_and_login()
    item = create_target(headers)
    add_check(item["id"], True, 100)
    response = client.delete("/target/" + str(item["id"]), headers=headers)
    assert response.status_code == 204
    assert client.get("/target/" + str(item["id"]), headers=headers).status_code == 404


def test_checker_rejects_localhost_without_network_request():
    from app.services.checker import check_api
    result = check_api("http://127.0.0.1:8000")
    assert result["is_healthy"] is False
    assert result["status_code"] is None
    assert "non-public" in result["error"] or "Localhost" in result["error"]
