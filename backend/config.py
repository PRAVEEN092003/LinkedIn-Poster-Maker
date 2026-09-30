"""
Application configuration.
All values are read from environment variables (via .env loaded by python-dotenv).
"""

import os

# Absolute path to the backend directory — ensures the SQLite file is always
# created in the same location regardless of where Flask is launched from.
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))


class Config:
    # Use DATABASE_URL env var if set, otherwise fall back to an absolute path
    # so the file always lands in backend/ even when the debug reloader is active.
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(_BASE_DIR, 'app.db')}",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")

    # JWT
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-key")
    JWT_EXPIRES_SECONDS = int(os.getenv("JWT_EXPIRES_SECONDS", 86400))  # 24 hours

    # Groq AI — key is NEVER exposed to the frontend
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama3-8b-8192")
