"""
Groq SDK wrapper.

Provides a single function `generate_linkedin_content()` that:
  - Builds a strict prompt asking the model for structured JSON
  - Calls the Groq Chat Completions API
  - Parses and validates the JSON response
  - Maps every possible error to a typed error code — no bare exceptions

Error codes returned in the dict:
  AI_NOT_CONFIGURED  — GROQ_API_KEY is missing
  AI_RATE_LIMITED    — 429 / quota exceeded
  AI_TIMEOUT         — network timeout
  AI_PARSE_ERROR     — model returned non-JSON or wrong schema
  AI_API_ERROR       — any other Groq API error
"""

import json
import re

from flask import current_app
from groq import (
    Groq,
    APIConnectionError,
    APITimeoutError,
    RateLimitError,
    APIStatusError,
)


# ── Allowed values ─────────────────────────────────────────────────────────────

ALLOWED_CONTENT_TYPES = {"Internship", "Achievement", "Learning", "Project", "General"}
ALLOWED_TONES = {"Professional", "Casual", "Inspirational", "Storytelling"}
ALLOWED_LENGTHS = {"Short", "Medium", "Long"}

# Approximate caption word targets per length
_LENGTH_GUIDE = {
    "Short": "60–80 words",
    "Medium": "120–150 words",
    "Long": "200–250 words",
}


# ── Prompt builder ─────────────────────────────────────────────────────────────

def _build_prompt(topic: str, content_type: str, tone: str, length: str) -> str:
    return f"""You are a professional LinkedIn content creator.

Generate LinkedIn post content about the following topic and return ONLY a valid JSON object — no markdown, no code fences, no extra text.

Topic: {topic}
Content type: {content_type}
Tone: {tone}
Caption length: {_LENGTH_GUIDE[length]}

Required JSON schema (return exactly these keys):
{{
  "headline": "A short, compelling headline (max 12 words)",
  "caption": "The full LinkedIn post caption ({_LENGTH_GUIDE[length]})",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "poster_text": "One punchy sentence (max 10 words) suitable for a visual poster"
}}

Rules:
- Return ONLY the JSON object, nothing else.
- headline must be under 12 words.
- hashtags must be a list of 5 strings, each starting with #.
- poster_text must be one sentence, max 10 words.
- Do not include any explanation or commentary outside the JSON."""


# ── Response validator ─────────────────────────────────────────────────────────

def _validate(data: dict) -> dict | None:
    """Return the validated dict or None if required keys are missing / wrong type."""
    required = {"headline", "caption", "hashtags", "poster_text"}
    if not required.issubset(data.keys()):
        return None
    if not isinstance(data["hashtags"], list) or len(data["hashtags"]) == 0:
        return None
    for key in ("headline", "caption", "poster_text"):
        if not isinstance(data[key], str) or not data[key].strip():
            return None
    return data


# ── Public API ─────────────────────────────────────────────────────────────────

def generate_linkedin_content(
    topic: str,
    content_type: str = "General",
    tone: str = "Professional",
    length: str = "Medium",
) -> dict:
    """
    Returns either:
      {"success": True, "data": { headline, caption, hashtags, poster_text }}
    or:
      {"success": False, "error": "<ERROR_CODE>", "message": "<human message>"}
    """
    api_key = current_app.config.get("GROQ_API_KEY", "")
    if not api_key:
        return {
            "success": False,
            "error": "AI_NOT_CONFIGURED",
            "message": "Groq API key is not configured on the server.",
        }

    model = current_app.config.get("GROQ_MODEL", "llama3-8b-8192")
    client = Groq(api_key=api_key)
    prompt = _build_prompt(topic, content_type, tone, length)

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1024,
            timeout=30,
        )
    except RateLimitError:
        return {
            "success": False,
            "error": "AI_RATE_LIMITED",
            "message": "AI generation is temporarily unavailable. Please try again later.",
        }
    except APITimeoutError:
        return {
            "success": False,
            "error": "AI_TIMEOUT",
            "message": "The AI request timed out. Please try again.",
        }
    except APIConnectionError:
        return {
            "success": False,
            "error": "AI_TIMEOUT",
            "message": "Could not reach the AI service. Check your network connection.",
        }
    except APIStatusError as exc:
        # Treat 429 status codes that slip past RateLimitError the same way
        if exc.status_code == 429:
            return {
                "success": False,
                "error": "AI_RATE_LIMITED",
                "message": "AI generation is temporarily unavailable. Please try again later.",
            }
        return {
            "success": False,
            "error": "AI_API_ERROR",
            "message": f"AI service returned an error (HTTP {exc.status_code}).",
        }
    except Exception:
        return {
            "success": False,
            "error": "AI_API_ERROR",
            "message": "An unexpected error occurred while calling the AI service.",
        }

    # ── Parse response content ────────────────────────────────────────────────
    raw = response.choices[0].message.content.strip()

    # Strip markdown fences if the model adds them despite instructions
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)
    raw = raw.strip()

    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return {
            "success": False,
            "error": "AI_PARSE_ERROR",
            "message": "The AI returned an unexpected response format. Please try again.",
        }

    validated = _validate(parsed)
    if validated is None:
        return {
            "success": False,
            "error": "AI_PARSE_ERROR",
            "message": "The AI response was missing required fields. Please try again.",
        }

    return {"success": True, "data": validated}
