import logging
from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse

logger = logging.getLogger('cloudcanary.routes.projects')
router = APIRouter()

@router.get('/', response_model=List[ProjectResponse])
async def list_projects(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return db.query(Project).offset(skip).limit(limit).all()

@router.get('/{project_id}', response_model=ProjectResponse)
async def get_project(project_id: UUID, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    return project

@router.post('/', response_model=ProjectResponse, status_code=201)
async def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    existing = db.query(Project).filter(Project.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=409, detail='Project with this name already exists')

    project = Project(**payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    logger.info(f'Created project: {project.name}')
    return project

@router.patch('/{project_id}', response_model=ProjectResponse)
async def update_project(project_id: UUID, payload: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    logger.info(f'Updated project: {project.name}')
    return project

@router.delete('/{project_id}', status_code=204)
async def delete_project(project_id: UUID, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')

    db.delete(project)
    db.commit()
    logger.info(f'Deleted project: {project.name}')
