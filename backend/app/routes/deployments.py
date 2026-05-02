import logging
from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.project import Project
from app.models.deployment import Deployment, DeploymentStatus
from app.models.log import DeploymentLog
from app.schemas.deployment import DeploymentCreate, DeploymentResponse, DeploymentLogResponse
from app.services.deploy import trigger_deployment
from app.services.rollback import perform_rollback

logger = logging.getLogger('cloudcanary.routes.deployments')
router = APIRouter()

@router.get('/', response_model=List[DeploymentResponse])
async def list_deployments(project_id: UUID = None, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(Deployment)
    if project_id:
        query = query.filter(Deployment.project_id == project_id)
    return query.order_by(Deployment.started_at.desc()).offset(skip).limit(limit).all()

@router.get('/{deployment_id}', response_model=DeploymentResponse)
async def get_deployment(deployment_id: UUID, db: Session = Depends(get_db)):
    deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail='Deployment not found')
    return deployment

@router.post('/', response_model=DeploymentResponse, status_code=201)
async def create_deployment(payload: DeploymentCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')

    deployment = Deployment(
        project_id=payload.project_id,
        commit_hash=payload.commit_hash,
        image_tag=payload.image_tag,
        status=DeploymentStatus.PENDING,
    )
    db.add(deployment)
    db.commit()
    db.refresh(deployment)

    logger.info(f'Deployment {deployment.id} created for project {project.name}')

    background_tasks.add_task(trigger_deployment, str(deployment.id))
    return deployment

@router.post('/{deployment_id}/rollback', response_model=DeploymentResponse)
async def rollback_deployment(deployment_id: UUID, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail='Deployment not found')

    background_tasks.add_task(perform_rollback, str(deployment.id))
    
    return deployment

@router.get('/{deployment_id}/logs', response_model=List[DeploymentLogResponse])
async def get_deployment_logs(deployment_id: UUID, db: Session = Depends(get_db)):
    deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail='Deployment not found')
    return db.query(DeploymentLog).filter(DeploymentLog.deployment_id == deployment_id).order_by(DeploymentLog.created_at.asc()).all()

