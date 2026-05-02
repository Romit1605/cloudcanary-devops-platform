"""
Pydantic schemas for Deployment and DeploymentLog.
"""

from datetime import datetime
from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel, Field


class DeploymentCreate(BaseModel):
    project_id: UUID = Field(..., description="Project to deploy")
    commit_hash: Optional[str] = Field(None, description="Git commit hash to deploy")
    image_tag: Optional[str] = Field(None)


class DeploymentLogResponse(BaseModel):
    id: UUID
    deployment_id: UUID
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


class DeploymentResponse(BaseModel):
    id: UUID
    project_id: UUID
    commit_hash: Optional[str]
    image_tag: Optional[str]
    status: str
    started_at: datetime
    finished_at: Optional[datetime]
    rollback_reason: Optional[str]
    is_stable: bool

    class Config:
        from_attributes = True
