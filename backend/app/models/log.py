"""
DeploymentLog model — stores log entries for deployment activities.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class LogLevel:
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    DEBUG = "debug"


class DeploymentLog(Base):
    __tablename__ = "deployment_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deployment_id = Column(UUID(as_uuid=True), ForeignKey("deployments.id"), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    deployment = relationship("Deployment", back_populates="logs")

    def __repr__(self):
        return f"<Log {self.message[:50]}>"
