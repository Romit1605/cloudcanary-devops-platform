"""
Pydantic schemas for Project CRUD operations.
"""

from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    repo_url: str = Field(..., description="GitHub repository URL")
    branch: str = Field(default="main", description="Git branch to deploy from")
    health_check_url: Optional[str] = Field(
        None, description="URL to check after deployment"
    )
    description: Optional[str] = Field(
        None, description="Project description"
    )


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    repo_url: Optional[str] = None
    branch: Optional[str] = None
    health_check_url: Optional[str] = None
    description: Optional[str] = None


class ProjectResponse(ProjectBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True