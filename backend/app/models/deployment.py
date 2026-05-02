"""
Deployment model — tracks each deployment attempt for a project.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class DeploymentStatus:
    PENDING = "PENDING"
    DEPLOYING = "DEPLOYING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    ROLLED_BACK = "ROLLED_BACK"


class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    commit_hash = Column(String(40), nullable=True)
    image_tag = Column(String(255), nullable=True)
    status = Column(String(50), default=DeploymentStatus.PENDING, index=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    finished_at = Column(DateTime(timezone=True), nullable=True)
    rollback_reason = Column(Text, nullable=True)
    is_stable = Column(Boolean, default=False)

    # Relationships
    project = relationship("Project", back_populates="deployments")
    logs = relationship("DeploymentLog", back_populates="deployment", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Deployment {self.id} [{self.status}]>"
