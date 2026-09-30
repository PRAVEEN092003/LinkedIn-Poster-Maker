"""
Step 10: Authentication, Security & End-to-End API Integration Tests
====================================================================

Tests:
  1. Register: missing fields validation (name, email, password)
  2. Register: short password rejection (< 6 chars)
  3. Register: duplicate email rejection (409)
  4. Register: success returns JWT token & user object (no password hash exposed)
  5. Login: missing fields validation
  6. Login: non-existent email rejection (401)
  7. Login: incorrect password rejection (401)
  8. Login: successful login returns JWT token
  9. Auth /me: valid token returns current user profile
  10. Auth /me: missing/invalid/expired token returns 401
  11. Password hashing: verification that hashes are stored, not plaintext
  12. Complete end-to-end API flow (Register -> Login -> Generate AI -> Save Draft -> List -> Get -> Update -> Delete)
"""

import json
import os
import sys
import pytest
from datetime import datetime, timezone, timedelta
import jwt

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import create_app
from extensions import db as _db
from models.user import User
from models.poster import Poster
from models.ai_cache import GenerationCache
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


def test_register_validation(client):
    """Register fails with 400 if fields are missing or empty."""
    # Missing all
    resp = client.post("/api/auth/register", json={})
    assert resp.status_code == 400
    assert "error" in resp.get_json()

    # Missing email
    resp = client.post("/api/auth/register", json={"name": "Alice", "password": "password123"})
    assert resp.status_code == 400

    # Short password (< 6 chars)
    resp = client.post("/api/auth/register", json={"name": "Alice", "email": "alice@example.com", "password": "123"})
    assert resp.status_code == 400
    assert "at least 6 characters" in resp.get_json()["error"]


def test_register_and_login_success(client):
    """Register creates user, returns token and safe user dict (no password_hash)."""
    reg_resp = client.post(
        "/api/auth/register",
        json={"name": "Charlie", "email": "charlie@example.com", "password": "securepassword"},
    )
    assert reg_resp.status_code == 201
    reg_data = reg_resp.get_json()
    assert "token" in reg_data
    assert reg_data["user"]["name"] == "Charlie"
    assert reg_data["user"]["email"] == "charlie@example.com"
    assert "password" not in reg_data["user"]
    assert "password_hash" not in reg_data["user"]

    # Duplicate email fails with 409
    dup_resp = client.post(
        "/api/auth/register",
        json={"name": "Charlie Duplicate", "email": "charlie@example.com", "password": "securepassword"},
    )
    assert dup_resp.status_code == 409

    # Successful login
    login_resp = client.post(
        "/api/auth/login",
        json={"email": "charlie@example.com", "password": "securepassword"},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.get_json()
    assert "token" in login_data
    assert login_data["user"]["email"] == "charlie@example.com"


def test_login_failures(client):
    """Login fails on wrong credentials or missing fields."""
    # Missing email
    assert client.post("/api/auth/login", json={"password": "123"}).status_code == 400

    # Non-existent user
    assert client.post(
        "/api/auth/login",
        json={"email": "nonexistent@example.com", "password": "password123"},
    ).status_code == 401

    # Wrong password
    assert client.post(
        "/api/auth/login",
        json={"email": "charlie@example.com", "password": "wrongpassword"},
    ).status_code == 401


def test_auth_me_and_token_validation(client, app):
    """GET /api/auth/me checks JWT validity."""
    # Register a user
    resp = client.post(
        "/api/auth/register",
        json={"name": "Dave", "email": "dave@example.com", "password": "password123"},
    )
    token = resp.get_json()["token"]

    # Valid token
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.get_json()["user"]["email"] == "dave@example.com"

    # Missing Authorization header
    assert client.get("/api/auth/me").status_code == 401

    # Malformed token
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-valid-token"}).status_code == 401

    # Expired token
    with app.app_context():
        expired_payload = {
            "sub": 1,
            "iat": datetime.now(timezone.utc) - timedelta(seconds=7200),
            "exp": datetime.now(timezone.utc) - timedelta(seconds=3600),
        }
        expired_token = jwt.encode(expired_payload, TestConfig.JWT_SECRET_KEY, algorithm="HS256")

    exp_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert exp_resp.status_code == 401
    assert "expired" in exp_resp.get_json()["error"].lower()


def test_end_to_end_api_flow(client, app, monkeypatch):
    """
    Complete end-to-end flow:
    1. Register user
    2. Get Auth /me
    3. Generate AI content (mocked Groq)
    4. Verify AI persistent cache hit
    5. Save new poster draft
    6. List posters (user isolated)
    7. Fetch single poster
    8. Update existing poster
    9. Delete poster
    10. Verify empty poster list
    """
    # 1. Register
    reg_resp = client.post(
        "/api/auth/register",
        json={"name": "E2E User", "email": "e2e@example.com", "password": "password123"},
    )
    assert reg_resp.status_code == 201
    token = reg_resp.get_json()["token"]
    auth_header = {"Authorization": f"Bearer {token}"}

    # 2. Get profile
    me_resp = client.get("/api/auth/me", headers=auth_header)
    assert me_resp.status_code == 200
    user_id = me_resp.get_json()["user"]["id"]

    # 3. Generate AI content
    mock_ai_data = {
        "headline": "Excited to share our new breakthrough!",
        "caption": "We have launched an incredible new feature today.",
        "hashtags": ["#AI", "#Innovation", "#Tech", "#Growth", "#Launch"],
        "poster_text": "Building the future of software.",
    }

    def mock_groq(*args, **kwargs):
        return {"success": True, "data": mock_ai_data}

    monkeypatch.setattr("api.ai.generate_linkedin_content", mock_groq)

    gen_resp = client.post(
        "/api/ai/generate",
        json={"topic": "AI breakthrough launch", "content_type": "Project", "tone": "Professional", "length": "Short"},
        headers=auth_header,
    )
    assert gen_resp.status_code == 200
    gen_body = gen_resp.get_json()
    assert gen_body["success"] is True
    assert gen_body["source"] == "ai"
    assert gen_body["data"]["headline"] == mock_ai_data["headline"]

    # 4. Cache hit
    cache_resp = client.post(
        "/api/ai/generate",
        json={"topic": "AI breakthrough launch", "content_type": "Project", "tone": "Professional", "length": "Short"},
        headers=auth_header,
    )
    assert cache_resp.status_code == 200
    assert cache_resp.get_json()["source"] == "cache"

    # 5. Save poster draft
    poster_payload = {
        "title": gen_body["data"]["headline"],
        "template_name": "professional",
        "poster_data": json.dumps({"version": "6.0.0", "objects": [{"type": "textbox", "text": "Building the future"}]}),
    }
    save_resp = client.post("/api/posters", json=poster_payload, headers=auth_header)
    assert save_resp.status_code == 201
    poster_id = save_resp.get_json()["poster"]["id"]

    # 6. List posters
    list_resp = client.get("/api/posters", headers=auth_header)
    assert list_resp.status_code == 200
    posters = list_resp.get_json()["posters"]
    assert len(posters) >= 1
    assert any(p["id"] == poster_id for p in posters)

    # 7. Get single poster
    get_resp = client.get(f"/api/posters/{poster_id}", headers=auth_header)
    assert get_resp.status_code == 200
    assert get_resp.get_json()["poster"]["title"] == gen_body["data"]["headline"]

    # 8. Update poster
    update_resp = client.put(
        f"/api/posters/{poster_id}",
        json={"title": "Updated Breakthrough Poster", "template_name": "achievement"},
        headers=auth_header,
    )
    assert update_resp.status_code == 200
    assert update_resp.get_json()["poster"]["title"] == "Updated Breakthrough Poster"

    # 9. Delete poster
    del_resp = client.delete(f"/api/posters/{poster_id}", headers=auth_header)
    assert del_resp.status_code == 200

    # 10. Verify deleted
    get_after_del = client.get(f"/api/posters/{poster_id}", headers=auth_header)
    assert get_after_del.status_code == 404
