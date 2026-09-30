"""
JWT helpers.

- create_token(user_id)  →  signed JWT string
- jwt_required           →  route decorator that validates the token
                            and injects g.current_user
"""

from datetime import datetime, timezone, timedelta
from functools import wraps

import jwt
from flask import current_app, request, jsonify, g

from models.user import User


def create_token(user_id: int) -> str:
    """Create a signed JWT for the given user id."""
    secret = current_app.config["JWT_SECRET_KEY"]
    expires = current_app.config["JWT_EXPIRES_SECONDS"]

    payload = {
        "sub": user_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(seconds=expires),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def jwt_required(f):
    """
    Decorator that:
    1. Reads the Authorization: Bearer <token> header.
    2. Validates and decodes the JWT.
    3. Looks up the user and stores it in flask.g.current_user.
    4. Returns 401 JSON on any failure.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or malformed Authorization header"}), 401

        token = auth_header.split(" ", 1)[1]

        try:
            payload = jwt.decode(
                token,
                current_app.config["JWT_SECRET_KEY"],
                algorithms=["HS256"],
            )
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        from extensions import db
        user = db.session.get(User, payload["sub"])
        if user is None:
            return jsonify({"error": "User not found"}), 401

        g.current_user = user
        return f(*args, **kwargs)

    return decorated
