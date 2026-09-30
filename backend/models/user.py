"""
User model.
"""

from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    posts = db.relationship("Post", back_populates="user", cascade="all, delete-orphan")
    posters = db.relationship("Poster", back_populates="user", cascade="all, delete-orphan")

    # ── Password helpers ──────────────────────────────────────────────────────

    def set_password(self, plain_text: str) -> None:
        """Hash and store a password. Never stores plain text."""
        self.password_hash = generate_password_hash(plain_text)

    def check_password(self, plain_text: str) -> bool:
        """Return True if plain_text matches the stored hash."""
        return check_password_hash(self.password_hash, plain_text)

    # ── Serialisation ─────────────────────────────────────────────────────────

    def to_dict(self) -> dict:
        """Safe public representation — password_hash is intentionally excluded."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<User id={self.id} email={self.email!r}>"
