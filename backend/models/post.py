"""
Post model — represents a LinkedIn text post (caption + hashtags).
"""

from datetime import datetime, timezone
from extensions import db


class Post(db.Model):
    __tablename__ = "posts"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    caption = db.Column(db.Text, nullable=False)
    hashtags = db.Column(db.Text, nullable=True)   # stored as comma-separated string
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationship back to User
    user = db.relationship("User", back_populates="posts")

    def __repr__(self):
        return f"<Post id={self.id} title={self.title!r}>"
