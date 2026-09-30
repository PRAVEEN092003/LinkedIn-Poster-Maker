"""
Poster model — represents a visual poster (canvas data, template, etc.).
"""

from datetime import datetime, timezone
from extensions import db


class Poster(db.Model):
    __tablename__ = "posters"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    template_name = db.Column(db.String(120), nullable=True)
    poster_data = db.Column(db.Text, nullable=True)   # JSON canvas state (Fabric.js later)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationship back to User
    user = db.relationship("User", back_populates="posters")

    def to_dict(self):
        """Safe public representation of a Poster."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "template_name": self.template_name,
            "poster_data": self.poster_data,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<Poster id={self.id} title={self.title!r}>"
