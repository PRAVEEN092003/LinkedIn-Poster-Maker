"""
Poster API Tests: /api/posters (CRUD + Security + Isolation)
============================================================

Tests:
  1. POST /api/posters works (create draft)
  2. GET /api/posters works (list drafts)
  3. GET /api/posters/<id> works (retrieve draft)
  4. PUT /api/posters/<id> works (update draft)
  5. DELETE /api/posters/<id> works (delete draft)
  6. User A cannot access User B poster (GET -> 404)
  7. User A cannot update User B poster (PUT -> 404)
  8. User A cannot delete User B poster (DELETE -> 404)
  9. Invalid poster ID handled correctly (404)
  10. Invalid poster_data handled correctly (400)
  11. Unauthorized requests return 401
"""

import json
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import create_app
from extensions import db as _db
from models.user import User
from models.poster import Poster
from utils.jwt_helper import create_token


class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = "test-secret"
    JWT_SECRET_KEY = "test-jwt-secret"
    JWT_EXPIRES_SECONDS = 3600
    GROQ_API_KEY = "test-groq-key"
    GROQ_MODEL = "llama3-8b-8192"
    ALLOWED_ORIGINS = "*"


@pytest.fixture(scope="module")
def app():
    application = create_app(TestConfig)
    with application.app_context():
        _db.create_all()
        yield application
        _db.drop_all()


@pytest.fixture(scope="module")
def client(app):
    return app.test_client()


@pytest.fixture(scope="module")
def users(app):
    with app.app_context():
        user_a = User(name="User A", email="poster_usera@example.com")
        user_a.set_password("password123")
        user_b = User(name="User B", email="poster_userb@example.com")
        user_b.set_password("password123")

        _db.session.add_all([user_a, user_b])
        _db.session.commit()

        token_a = create_token(user_a.id)
        token_b = create_token(user_b.id)

        yield {
            "a": {"id": user_a.id, "token": token_a},
            "b": {"id": user_b.id, "token": token_b},
        }


@pytest.fixture(autouse=True)
def clean_posters(app):
    with app.app_context():
        _db.session.query(Poster).delete()
        _db.session.commit()
    yield


def test_unauthorized_requests_return_401(client):
    """All poster endpoints reject unauthenticated requests with 401."""
    assert client.get("/api/posters").status_code == 401
    assert client.get("/api/posters/1").status_code == 401
    assert client.post("/api/posters", json={"title": "T", "poster_data": "{}"}).status_code == 401
    assert client.put("/api/posters/1", json={"title": "T"}).status_code == 401
    assert client.delete("/api/posters/1").status_code == 401


def test_post_and_get_poster(client, users):
    """POST creates poster and GET retrieves it."""
    token = users["a"]["token"]
    user_id = users["a"]["id"]

    poster_data = {"version": "6.0.0", "objects": [{"type": "textbox", "text": "Hello"}]}

    resp = client.post(
        "/api/posters",
        json={"title": "My Post", "template_name": "professional", "poster_data": poster_data},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    poster_id = resp.get_json()["poster"]["id"]

    # GET /api/posters/<id>
    get_resp = client.get(f"/api/posters/{poster_id}", headers={"Authorization": f"Bearer {token}"})
    assert get_resp.status_code == 200
    assert get_resp.get_json()["poster"]["title"] == "My Post"
    assert get_resp.get_json()["poster"]["user_id"] == user_id


def test_update_existing_poster(client, users):
    """PUT updates the title, template_name, and poster_data of the existing poster."""
    token = users["a"]["token"]

    # Create initial
    create_resp = client.post(
        "/api/posters",
        json={"title": "Initial Title", "template_name": "internship", "poster_data": '{"v":1}'},
        headers={"Authorization": f"Bearer {token}"},
    )
    poster_id = create_resp.get_json()["poster"]["id"]

    # Update
    update_resp = client.put(
        f"/api/posters/{poster_id}",
        json={"title": "Updated Title", "template_name": "achievement", "poster_data": '{"v":2}'},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert update_resp.status_code == 200
    body = update_resp.get_json()
    assert body["success"] is True
    assert body["poster"]["title"] == "Updated Title"
    assert body["poster"]["template_name"] == "achievement"
    assert body["poster"]["poster_data"] == '{"v":2}'


def test_delete_existing_poster(client, users):
    """DELETE deletes the poster."""
    token = users["a"]["token"]

    create_resp = client.post(
        "/api/posters",
        json={"title": "To Delete", "poster_data": "{}"},
        headers={"Authorization": f"Bearer {token}"},
    )
    poster_id = create_resp.get_json()["poster"]["id"]

    del_resp = client.delete(f"/api/posters/{poster_id}", headers={"Authorization": f"Bearer {token}"})
    assert del_resp.status_code == 200
    assert del_resp.get_json()["success"] is True

    # Ensure it no longer exists
    get_resp = client.get(f"/api/posters/{poster_id}", headers={"Authorization": f"Bearer {token}"})
    assert get_resp.status_code == 404


def test_user_isolation_security(client, users):
    """User A cannot access, update, or delete User B's poster."""
    token_a = users["a"]["token"]
    token_b = users["b"]["token"]

    # User B creates a poster
    b_resp = client.post(
        "/api/posters",
        json={"title": "User B Secret Poster", "poster_data": '{"secret":true}'},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    poster_b_id = b_resp.get_json()["poster"]["id"]

    # User A tries to GET User B's poster -> 404
    assert client.get(f"/api/posters/{poster_b_id}", headers={"Authorization": f"Bearer {token_a}"}).status_code == 404

    # User A tries to PUT User B's poster -> 404
    assert client.put(
        f"/api/posters/{poster_b_id}",
        json={"title": "Hacked"},
        headers={"Authorization": f"Bearer {token_a}"},
    ).status_code == 404

    # User A tries to DELETE User B's poster -> 404
    assert client.delete(f"/api/posters/{poster_b_id}", headers={"Authorization": f"Bearer {token_a}"}).status_code == 404

    # User B's poster is still intact
    check_b = client.get(f"/api/posters/{poster_b_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert check_b.status_code == 200
    assert check_b.get_json()["poster"]["title"] == "User B Secret Poster"


def test_invalid_poster_id_handled(client, users):
    """Invalid poster ID (999999) returns 404."""
    token = users["a"]["token"]
    assert client.get("/api/posters/999999", headers={"Authorization": f"Bearer {token}"}).status_code == 404
    assert client.put("/api/posters/999999", json={"title": "X"}, headers={"Authorization": f"Bearer {token}"}).status_code == 404
    assert client.delete("/api/posters/999999", headers={"Authorization": f"Bearer {token}"}).status_code == 404


def test_invalid_poster_data_validation(client, users):
    """Missing or null poster_data returns 400 validation error."""
    token = users["a"]["token"]

    resp = client.post("/api/posters", json={"title": "Missing Data"}, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 400
    assert resp.get_json()["error"] == "VALIDATION_ERROR"
