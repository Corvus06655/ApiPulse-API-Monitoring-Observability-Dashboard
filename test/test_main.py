from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import CheckResult

TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
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


def setup_function():
    Base.metadata.drop_all(bind=TEST_ENGINE)
    Base.metadata.create_all(bind=TEST_ENGINE)


def create_target(name="Test API", url="https://example.com"):
    response = client.post("/target/", json={"name": name, "url": url})
    assert response.status_code == 201
    return response.json()


def add_check(target_id, healthy, response_time, status_code=200):
    db = TestSessionLocal()
    try:
        db.add(
            CheckResult(
                target_id=target_id,
                status_code=status_code if healthy else None,
                response_time_ms=response_time,
                is_healthy=healthy,
                error=None if healthy else "check failed",
            )
        )
        db.commit()
    finally:
        db.close()


def test_home():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to ApiPulse!", "status": "running"}


def test_get_targets():
    create_target()
    response = client.get("/target/")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["name"] == "Test API"


def test_create_target():
    response = client.post("/target/", json={"name": "Test API", "url": "https://example.com"})
    assert response.status_code == 201
    assert response.json()["name"] == "Test API"
    assert response.json()["url"].rstrip("/") == "https://example.com"


def test_target_not_found():
    response = client.get("/target/999999")
    assert response.status_code == 404
    assert response.json() == {"detail": "Target not found"}


def test_run_target_check_saves_result():
    item = create_target()
    fake_result = {
        "url": item["url"],
        "status_code": 200,
        "response_time_ms": 120.0,
        "is_healthy": True,
        "error": None,
    }
    with patch("app.router.targets.check_api", return_value=fake_result):
        response = client.post(f"/target/{item['id']}/check")
    assert response.status_code == 200
    assert response.json()["is_healthy"] is True
    assert response.json()["target_id"] == item["id"]
    history = client.get(f"/target/{item['id']}/history").json()
    assert history["total_checks"] == 1


def test_history_only_returns_checks_for_requested_target():
    first = create_target(name="First API")
    second = create_target(name="Second API", url="https://example.org")
    add_check(first["id"], True, 100)
    add_check(second["id"], False, 300, status_code=None)
    response = client.get(f"/target/{first['id']}/history")
    assert response.status_code == 200
    assert response.json()["total_checks"] == 1
    assert all(row["target_id"] == first["id"] for row in response.json()["history"])


def test_stats_calculate_percentage_and_average_correctly():
    item = create_target()
    add_check(item["id"], True, 100)
    add_check(item["id"], True, 200)
    add_check(item["id"], False, 300, status_code=None)
    response = client.get(f"/target/{item['id']}/stats")
    assert response.status_code == 200
    assert response.json() == {
        "target_id": item["id"],
        "target_name": "Test API",
        "total_checks": 3,
        "successful_checks": 2,
        "failed_checks": 1,
        "uptime_percentage": 66.67,
        "average_response_time_ms": 200.0,
    }


def test_delete_target_also_deletes_history():
    item = create_target()
    add_check(item["id"], True, 100)
    response = client.delete(f"/target/{item['id']}")
    assert response.status_code == 204
    assert client.get(f"/target/{item['id']}").status_code == 404


def test_checker_rejects_localhost_without_network_request():
    from app.services.checker import check_api

    result = check_api("http://127.0.0.1:8000")
    assert result["is_healthy"] is False
    assert result["status_code"] is None
    assert "non-public" in result["error"] or "Localhost" in result["error"]
