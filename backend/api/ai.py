"""
AI content generation endpoint.

POST /api/ai/generate
  - Requires a valid JWT (Authorization: Bearer <token>)
  - Validates input
  - Delegates to utils.groq_client
  - Returns structured JSON or a typed error response
  - Never leaks GROQ_API_KEY
"""

import hashlib
import json
from flask import Blueprint, request, jsonify, g

from extensions import db
from models.post import Post
from models.ai_cache import GenerationCache
from utils.jwt_helper import jwt_required
from utils.groq_client import (
    generate_linkedin_content,
    ALLOWED_CONTENT_TYPES,
    ALLOWED_TONES,
    ALLOWED_LENGTHS,
)

ai_bp = Blueprint("ai", __name__)


def _compute_cache_key(user_id: int, topic: str, content_type: str, tone: str, length: str) -> str:
    """Deterministic cache key based on user and request parameters."""
    raw = f"{user_id}:{topic.strip().lower()}:{content_type.strip().lower()}:{tone.strip().lower()}:{length.strip().lower()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


@ai_bp.post("/generate")
@jwt_required
def generate():
    """
    POST /api/ai/generate
    Header : Authorization: Bearer <token>
    Body   : { "topic": str, "content_type"?: str, "tone"?: str, "length"?: str }
    """
    data = request.get_json(silent=True) or {}

    # ── Input validation ──────────────────────────────────────────────────────

    topic = str(data.get("topic", "")).strip()
    if not topic:
        return jsonify({
            "success": False,
            "error": "VALIDATION_ERROR",
            "message": "'topic' is required and cannot be empty.",
        }), 400

    if len(topic) > 300:
        return jsonify({
            "success": False,
            "error": "VALIDATION_ERROR",
            "message": "'topic' must be 300 characters or fewer.",
        }), 400

    content_type = str(data.get("content_type", "General")).strip()
    if content_type not in ALLOWED_CONTENT_TYPES:
        return jsonify({
            "success": False,
            "error": "VALIDATION_ERROR",
            "message": f"'content_type' must be one of: {sorted(ALLOWED_CONTENT_TYPES)}.",
        }), 400

    tone = str(data.get("tone", "Professional")).strip()
    if tone not in ALLOWED_TONES:
        return jsonify({
            "success": False,
            "error": "VALIDATION_ERROR",
            "message": f"'tone' must be one of: {sorted(ALLOWED_TONES)}.",
        }), 400

    length = str(data.get("length", "Medium")).strip()
    if length not in ALLOWED_LENGTHS:
        return jsonify({
            "success": False,
            "error": "VALIDATION_ERROR",
            "message": f"'length' must be one of: {sorted(ALLOWED_LENGTHS)}.",
        }), 400

    # ── Check persistent cache ───────────────────────────────────────────────

    cache_key = _compute_cache_key(
        user_id=g.current_user.id,
        topic=topic,
        content_type=content_type,
        tone=tone,
        length=length,
    )

    cached_entry = GenerationCache.query.filter_by(cache_key=cache_key).first()
    if cached_entry:
        cached_data = json.loads(cached_entry.response_json)
        return jsonify({
            "success": True,
            "data": cached_data,
            "source": "cache",
        }), 200

    # ── Call Groq ─────────────────────────────────────────────────────────────

    result = generate_linkedin_content(
        topic=topic,
        content_type=content_type,
        tone=tone,
        length=length,
    )

    # ── Map result to HTTP response ───────────────────────────────────────────

    if not result["success"]:
        error_code = result.get("error", "AI_API_ERROR")
        http_status = 429 if error_code == "AI_RATE_LIMITED" else 503
        return jsonify(result), http_status

    ai_data = result["data"]

    # ── Persist to Post table & Generation Cache ──────────────────────────────

    try:
        hashtags_val = ai_data.get("hashtags", [])
        hashtags_str = ", ".join(hashtags_val) if isinstance(hashtags_val, list) else str(hashtags_val)

        post = Post(
            user_id=g.current_user.id,
            title=ai_data.get("headline", topic)[:255],
            caption=ai_data.get("caption", ""),
            hashtags=hashtags_str,
        )
        db.session.add(post)

        cache_entry = GenerationCache(
            cache_key=cache_key,
            user_id=g.current_user.id,
            topic=topic,
            content_type=content_type,
            tone=tone,
            length=length,
            response_json=json.dumps(ai_data),
        )
        db.session.add(cache_entry)
        db.session.commit()
    except Exception:
        db.session.rollback()

    return jsonify({
        "success": True,
        "data": ai_data,
        "source": "ai",
    }), 200
