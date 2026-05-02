"""
Project model — represents a registered application to deploy.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True, index=True)
    repo_url = Column(String(512), nullable=False)
    branch = Column(String(128), default="main")
    health_check_url = Column(String(512), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    deployments = relationship(
        "Deployment",
        back_populates="project",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Project {self.name}>"