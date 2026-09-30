"""
Poster API endpoints.

POST /api/posters      — save a new poster draft (JWT required)
GET  /api/posters      — list posters belonging to current user (JWT required)
GET  /api/posters/<id> — get a specific poster belonging to current user (JWT required)
"""

import json
from flask import Blueprint, request, jsonify, g

from extensions import db
from models.poster import Poster
from utils.jwt_helper import jwt_required

posters_bp = Blueprint("posters", __name__)


@posters_bp.post("")
@jwt_required
def save_poster():
    """
    POST /api/posters
    Header : Authorization: Bearer <token>
    Body   : { "title": str, "template_name"?: str, "poster_data": str|dict }
    """
    data = request.get_json(silent=True) or {}

    title = str(data.get("title", "Untitled Poster")).strip()
    if not title:
        title = "Untitled Poster"

    if len(title) > 255:
        title = title[:255]

    template_name = str(data.get("template_name", "custom")).strip()
    if len(template_name) > 120:
        template_name = template_name[:120]

    raw_poster_data = data.get("poster_data")
    if raw_poster_data is None:
        return jsonify({
            "success": False,
            "error": "VALIDATION_ERROR",
            "message": "'poster_data' is required",
        }), 400

    if isinstance(raw_poster_data, (dict, list)):
        poster_data_str = json.dumps(raw_poster_data)
    else:
        poster_data_str = str(raw_poster_data)

    try:
        poster = Poster(
            user_id=g.current_user.id,
            title=title,
            template_name=template_name,
            poster_data=poster_data_str,
        )
        db.session.add(poster)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Poster saved successfully",
            "poster": poster.to_dict(),
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": "DATABASE_ERROR",
            "message": "Failed to save poster draft to database",
        }), 500


@posters_bp.get("")
@jwt_required
def list_posters():
    """
    GET /api/posters
    Header : Authorization: Bearer <token>
    Returns all posters belonging ONLY to the authenticated user.
    """
    posters = (
        Poster.query.filter_by(user_id=g.current_user.id)
        .order_by(Poster.created_at.desc())
        .all()
    )

    return jsonify({
        "success": True,
        "posters": [p.to_dict() for p in posters],
    }), 200


@posters_bp.get("/<int:poster_id>")
@jwt_required
def get_poster(poster_id: int):
    """
    GET /api/posters/<id>
    Header : Authorization: Bearer <token>
    Returns a specific poster if and only if it belongs to current user.
    """
    poster = Poster.query.filter_by(id=poster_id, user_id=g.current_user.id).first()
    if poster is None:
        return jsonify({
            "success": False,
            "error": "NOT_FOUND",
            "message": "Poster not found",
        }), 404

    return jsonify({
        "success": True,
        "poster": poster.to_dict(),
    }), 200


@posters_bp.put("/<int:poster_id>")
@jwt_required
def update_poster(poster_id: int):
    """
    PUT /api/posters/<id>
    Header : Authorization: Bearer <token>
    Body   : { "title"?: str, "template_name"?: str, "poster_data": str|dict }
    Updates an existing poster belonging to current user.
    """
    poster = Poster.query.filter_by(id=poster_id, user_id=g.current_user.id).first()
    if poster is None:
        return jsonify({
            "success": False,
            "error": "NOT_FOUND",
            "message": "Poster not found",
        }), 404

    data = request.get_json(silent=True) or {}

    if "title" in data:
        title = str(data["title"]).strip()
        if title:
            poster.title = title[:255]

    if "template_name" in data:
        template_name = str(data["template_name"]).strip()
        if template_name:
            poster.template_name = template_name[:120]

    if "poster_data" in data:
        raw_poster_data = data["poster_data"]
        if raw_poster_data is None:
            return jsonify({
                "success": False,
                "error": "VALIDATION_ERROR",
                "message": "'poster_data' cannot be empty",
            }), 400

        if isinstance(raw_poster_data, (dict, list)):
            poster.poster_data = json.dumps(raw_poster_data)
        else:
            poster.poster_data = str(raw_poster_data)

    try:
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Poster updated successfully",
            "poster": poster.to_dict(),
        }), 200
    except Exception:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": "DATABASE_ERROR",
            "message": "Failed to update poster in database",
        }), 500


@posters_bp.delete("/<int:poster_id>")
@jwt_required
def delete_poster(poster_id: int):
    """
    DELETE /api/posters/<id>
    Header : Authorization: Bearer <token>
    Deletes an existing poster belonging to current user.
    """
    poster = Poster.query.filter_by(id=poster_id, user_id=g.current_user.id).first()
    if poster is None:
        return jsonify({
            "success": False,
            "error": "NOT_FOUND",
            "message": "Poster not found",
        }), 404

    try:
        db.session.delete(poster)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Poster deleted successfully",
        }), 200
    except Exception:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": "DATABASE_ERROR",
            "message": "Failed to delete poster from database",
        }), 500
