"""
Shared Flask extensions.
Instantiated here and initialised inside create_app() to avoid circular imports.
"""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
