"""
Authentication endpoints.

POST /api/auth/register  — create a new account
POST /api/auth/login     — validate credentials, return JWT
GET  /api/auth/me        — return current user (JWT required)
"""

from flask import Blueprint, request, jsonify, g

from extensions import db
from models.user import User
from utils.jwt_helper import create_token, jwt_required

auth_bp = Blueprint("auth", __name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _missing(*fields):
    """Return the first field name that is absent or blank, else None."""
    data = request.get_json(silent=True) or {}
    for f in fields:
        if not str(data.get(f, "")).strip():
            return f
    return None


# ── Routes ────────────────────────────────────────────────────────────────────

@auth_bp.post("/register")
def register():
    """
    POST /api/auth/register
    Body: { "name": str, "email": str, "password": str }
    """
    data = request.get_json(silent=True) or {}

    # Validate required fields
    missing = _missing("name", "email", "password")
    if missing:
        return jsonify({"error": f"'{missing}' is required"}), 400

    name = data["name"].strip()
    email = data["email"].strip().lower()
    password = data["password"]

    # Minimum password length
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # Prevent duplicate emails
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with that email already exists"}), 409

    user = User(name=name, email=email)
    user.set_password(password)          # hashed — never stored as plain text

    db.session.add(user)
    db.session.commit()

    token = create_token(user.id)

    return jsonify({
        "message": "Account created successfully",
        "token": token,
        "user": user.to_dict(),
    }), 201


@auth_bp.post("/login")
def login():
    """
    POST /api/auth/login
    Body: { "email": str, "password": str }
    """
    data = request.get_json(silent=True) or {}

    missing = _missing("email", "password")
    if missing:
        return jsonify({"error": f"'{missing}' is required"}), 400

    email = data["email"].strip().lower()
    password = data["password"]

    user = User.query.filter_by(email=email).first()

    # Deliberately vague error to prevent user enumeration
    if user is None or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_token(user.id)

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": user.to_dict(),
    }), 200


@auth_bp.get("/me")
@jwt_required
def me():
    """
    GET /api/auth/me
    Header: Authorization: Bearer <token>
    """
    return jsonify({"user": g.current_user.to_dict()}), 200
