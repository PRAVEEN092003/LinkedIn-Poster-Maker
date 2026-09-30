import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from config import Config
from extensions import db
import models  # noqa: F401 — registers all tables with SQLAlchemy metadata
from api.health import health_bp
from api.auth import auth_bp
from api.ai import ai_bp
from api.posters import posters_bp

load_dotenv()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # CORS — allow requests from the Vite dev server
    CORS(app, resources={r"/api/*": {"origins": app.config["ALLOWED_ORIGINS"]}})

    # Initialise extensions
    db.init_app(app)

    # Create all tables if they don't exist
    with app.app_context():
        db.create_all()

    # Register blueprints
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(ai_bp, url_prefix="/api/ai")
    app.register_blueprint(posters_bp, url_prefix="/api/posters")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
