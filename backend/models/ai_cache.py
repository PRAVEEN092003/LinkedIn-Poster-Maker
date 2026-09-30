"""
GenerationCache model — persistent SQLite cache for AI content generations.
"""

from datetime import datetime, timezone
from extensions import db


class GenerationCache(db.Model):
    __tablename__ = "generation_cache"

    id = db.Column(db.Integer, primary_key=True)
    cache_key = db.Column(db.String(64), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    topic = db.Column(db.String(300), nullable=False)
    content_type = db.Column(db.String(50), nullable=False)
    tone = db.Column(db.String(50), nullable=False)
    length = db.Column(db.String(50), nullable=False)
    response_json = db.Column(db.Text, nullable=False)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationship back to User
    user = db.relationship("User", backref=db.backref("generation_caches", cascade="all, delete-orphan"))

    def __repr__(self):
        return f"<GenerationCache id={self.id} key={self.cache_key!r}>"
