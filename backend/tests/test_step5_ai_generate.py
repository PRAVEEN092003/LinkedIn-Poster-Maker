"""
Step 5 – AI Content Generation: /api/ai/generate
=================================================

Tests:
  1. Cache hit          — identical request served from cache (no second Groq call)
  2. Cache miss         — first request hits Groq
  3. Successful AI      — 200 with correct JSON shape
  4. Groq rate-limit    — RateLimitError  → HTTP 429, error=AI_RATE_LIMITED
  5. Groq timeout       — APITimeoutError → HTTP 503, error=AI_TIMEOUT
  6. Groq API error     — APIStatusError  → HTTP 503, error=AI_API_ERROR
  7. Unauthenticated    — no/bad JWT      → HTTP 401
  8. DB persistence     — successful generation saves Post to DB
"""

import json
import sys
import os
import pytest
from unittest.mock import MagicMock, patch

# Make sure the backend root is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import create_app
from extensions import db as _db
from models.user import User
from models.post import Post
from models.ai_cache import GenerationCache
from utils.jwt_helper import create_token

import groq as _groq_module

RateLimitError  = _groq_module.RateLimitError
APITimeoutError = _groq_module.APITimeoutError
APIStatusError  = _groq_module.APIStatusError


# ── TestConfig ────────────────────────────────────────────────────────────────

class TestConfig:
    TESTING            = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY         = "test-secret"
    JWT_SECRET_KEY     = "test-jwt-secret"
    JWT_EXPIRES_SECONDS = 3600
    GROQ_API_KEY       = "test-groq-key"
    GROQ_MODEL         = "llama3-8b-8192"
    ALLOWED_ORIGINS    = "*"


# ── Fixtures ──────────────────────────────────────────────────────────────────

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
def auth_user(app):
    with app.app_context():
        user = User(name="Test User", email="step5test@example.com")
        user.set_password("password123")
        _db.session.add(user)
        _db.session.commit()
        token = create_token(user.id)
        user_id = user.id
    yield user_id, token


@pytest.fixture(autouse=True)
def clean_db(app):
    with app.app_context():
        _db.session.query(Post).delete()
        _db.session.query(GenerationCache).delete()
        _db.session.commit()
    yield


# ── Helpers ───────────────────────────────────────────────────────────────────

_SAMPLE_PAYLOAD = {
    "topic": "AI in healthcare",
    "content_type": "General",
    "tone": "Professional",
    "length": "Medium",
}

_SAMPLE_AI_JSON = json.dumps({
    "headline": "AI is Transforming Healthcare",
    "caption": "Artificial intelligence is reshaping how doctors diagnose patients. "
               "From early cancer detection to personalised treatment plans, "
               "machine learning models are proving invaluable. "
               "As we stand at the frontier of medical innovation, one thing is clear: "
               "the future of healthcare is data-driven.",
    "hashtags": ["#AI", "#Healthcare", "#Innovation", "#MedTech", "#FutureOfMedicine"],
    "poster_text": "AI: the new heartbeat of healthcare.",
})


def _make_groq_response(content: str):
    message  = MagicMock()
    message.content = content
    choice   = MagicMock()
    choice.message = message
    response = MagicMock()
    response.choices = [choice]
    return response


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── Test 7: Unauthenticated request ───────────────────────────────────────────

def test_unauthenticated_no_header(client):
    """No Authorization header → 401."""
    resp = client.post("/api/ai/generate", json=_SAMPLE_PAYLOAD)
    assert resp.status_code == 401, (
        f"Expected 401 for missing auth header, got {resp.status_code}"
    )


def test_unauthenticated_bad_token(client):
    """Garbage JWT → 401."""
    resp = client.post(
        "/api/ai/generate",
        json=_SAMPLE_PAYLOAD,
        headers={"Authorization": "Bearer garbage.token.here"},
    )
    assert resp.status_code == 401, (
        f"Expected 401 for invalid token, got {resp.status_code}"
    )


# ── Test 3: Successful AI response ───────────────────────────────────────────

def test_successful_ai_response(client, auth_user):
    """Valid JWT + valid payload → 200 with correct JSON shape."""
    _, token = auth_user
    groq_resp = _make_groq_response(_SAMPLE_AI_JSON)

    with patch("utils.groq_client.Groq") as MockGroq:
        MockGroq.return_value.chat.completions.create.return_value = groq_resp
        resp = client.post(
            "/api/ai/generate",
            json=_SAMPLE_PAYLOAD,
            headers=_auth_headers(token),
        )

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.data}"
    body = resp.get_json()
    assert body["success"] is True
    data = body["data"]
    assert "headline"    in data
    assert "caption"     in data
    assert "hashtags"    in data
    assert "poster_text" in data
    assert isinstance(data["hashtags"], list)
    assert len(data["hashtags"]) > 0


# ── Test 4: Groq rate-limit fallback ─────────────────────────────────────────

def test_groq_rate_limit_fallback(client, auth_user):
    """RateLimitError from Groq → 429 with error=AI_RATE_LIMITED."""
    _, token = auth_user

    mock_response = MagicMock()
    mock_response.status_code = 429
    mock_response.headers    = {}
    mock_response.text       = "rate limited"

    with patch("utils.groq_client.Groq") as MockGroq:
        MockGroq.return_value.chat.completions.create.side_effect = (
            RateLimitError("rate limited", response=mock_response, body={})
        )
        resp = client.post(
            "/api/ai/generate",
            json=_SAMPLE_PAYLOAD,
            headers=_auth_headers(token),
        )

    assert resp.status_code == 429, f"Expected 429, got {resp.status_code}: {resp.data}"
    body = resp.get_json()
    assert body["success"] is False
    assert body["error"] == "AI_RATE_LIMITED"


# ── Test 5: Groq timeout fallback ─────────────────────────────────────────────

def test_groq_timeout_fallback(client, auth_user):
    """APITimeoutError from Groq → 503 with error=AI_TIMEOUT."""
    _, token = auth_user

    with patch("utils.groq_client.Groq") as MockGroq:
        MockGroq.return_value.chat.completions.create.side_effect = (
            APITimeoutError(request=MagicMock())
        )
        resp = client.post(
            "/api/ai/generate",
            json=_SAMPLE_PAYLOAD,
            headers=_auth_headers(token),
        )

    assert resp.status_code == 503, f"Expected 503, got {resp.status_code}: {resp.data}"
    body = resp.get_json()
    assert body["success"] is False
    assert body["error"] == "AI_TIMEOUT"


# ── Test 6: Groq API error fallback ──────────────────────────────────────────

def test_groq_api_error_fallback(client, auth_user):
    """APIStatusError (non-429) from Groq → 503 with error=AI_API_ERROR."""
    _, token = auth_user

    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.headers    = {}
    mock_response.text       = "internal server error"

    with patch("utils.groq_client.Groq") as MockGroq:
        MockGroq.return_value.chat.completions.create.side_effect = (
            APIStatusError(
                "internal server error",
                response=mock_response,
                body={},
            )
        )
        resp = client.post(
            "/api/ai/generate",
            json=_SAMPLE_PAYLOAD,
            headers=_auth_headers(token),
        )

    assert resp.status_code == 503, f"Expected 503, got {resp.status_code}: {resp.data}"
    body = resp.get_json()
    assert body["success"] is False
    assert body["error"] == "AI_API_ERROR"


# ── Test 2: Cache miss ────────────────────────────────────────────────────────

def test_cache_miss_calls_groq(client, auth_user):
    """
    A brand-new topic should reach the Groq SDK at least once (cache miss).
    Passes whether or not a cache is implemented.
    """
    _, token = auth_user
    payload  = {**_SAMPLE_PAYLOAD, "topic": "unique-topic-for-cache-miss-test-xyz"}
    groq_resp = _make_groq_response(_SAMPLE_AI_JSON)

    with patch("utils.groq_client.Groq") as MockGroq:
        mock_create = MockGroq.return_value.chat.completions.create
        mock_create.return_value = groq_resp

        resp = client.post(
            "/api/ai/generate",
            json=payload,
            headers=_auth_headers(token),
        )

        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.data}"
        assert mock_create.call_count >= 1, (
            "Expected Groq SDK to be called at least once on a cache miss"
        )


# ── Test 1: Cache hit ─────────────────────────────────────────────────────────

def test_cache_hit_skips_groq(client, auth_user):
    """
    Two identical requests with the same parameters.
    - Caching IS implemented  → Groq called exactly 1 time (second is cache hit).
    - Caching NOT implemented → Groq called 2 times → FAILS (expected).
    """
    _, token = auth_user
    payload  = {**_SAMPLE_PAYLOAD, "topic": "unique-topic-for-cache-hit-test-abc"}
    groq_resp = _make_groq_response(_SAMPLE_AI_JSON)

    with patch("utils.groq_client.Groq") as MockGroq:
        mock_create = MockGroq.return_value.chat.completions.create
        mock_create.return_value = groq_resp

        # First request — always a miss
        resp1 = client.post(
            "/api/ai/generate",
            json=payload,
            headers=_auth_headers(token),
        )
        assert resp1.status_code == 200

        # Second identical request — should be served from cache
        resp2 = client.post(
            "/api/ai/generate",
            json=payload,
            headers=_auth_headers(token),
        )
        assert resp2.status_code == 200
        assert resp2.get_json().get("source") == "cache"

        assert mock_create.call_count == 1, (
            f"CACHE NOT IMPLEMENTED: Groq was called {mock_create.call_count} times "
            "for two identical requests. Expected 1 call (cache hit on second request)."
        )


# ── Test 8: Database persistence ─────────────────────────────────────────────

def test_db_persistence_after_generate(client, auth_user, app):
    """
    A successful generation should save a Post record to the database.
    If no persistence logic exists, this test FAILS (expected).
    """
    user_id, token = auth_user
    payload  = {**_SAMPLE_PAYLOAD, "topic": "unique-topic-for-db-persistence-test-999"}
    groq_resp = _make_groq_response(_SAMPLE_AI_JSON)

    with app.app_context():
        pre_count = Post.query.filter_by(user_id=user_id).count()

    with patch("utils.groq_client.Groq") as MockGroq:
        MockGroq.return_value.chat.completions.create.return_value = groq_resp
        resp = client.post(
            "/api/ai/generate",
            json=payload,
            headers=_auth_headers(token),
        )

    assert resp.status_code == 200

    with app.app_context():
        post_count = Post.query.filter_by(user_id=user_id).count()
        latest_post = Post.query.filter_by(user_id=user_id).order_by(Post.id.desc()).first()

    assert post_count == pre_count + 1, (
        f"DB PERSISTENCE NOT IMPLEMENTED: Post count before={pre_count}, "
        f"after={post_count}. Expected exactly 1 new Post record saved."
    )
    assert latest_post is not None
    assert latest_post.user_id == user_id
    assert latest_post.title == "AI is Transforming Healthcare"
    assert "Artificial intelligence" in latest_post.caption
    assert "#AI" in latest_post.hashtags
    assert latest_post.created_at is not None
