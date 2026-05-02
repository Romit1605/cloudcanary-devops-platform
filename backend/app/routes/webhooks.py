import logging
import asyncio
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.project import Project
from app.models.deployment import Deployment, DeploymentStatus
from app.services.deploy import trigger_deployment

logger = logging.getLogger('cloudcanary.routes.webhooks')
router = APIRouter()

@router.post('/github')
async def github_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.json()
    
    repo_url = payload.get('repository', '')
    ref = payload.get('branch', '')
    commit_hash = payload.get('commit', '')
    image_tag = payload.get('image', '')

    logger.info(f'Received webhook for {repo_url} branch={ref} commit={commit_hash[:8]}')

    project = db.query(Project).filter(
        Project.repo_url == repo_url,
    ).first()

    if not project:
        logger.warning(f'No project found for repo: {repo_url}')
        return {'message': 'No matching project found'}

    if ref and ref != project.branch:
        return {'message': f'Ignored branch: {ref} (expected {project.branch})'}

    deployment = Deployment(
        project_id=project.id,
        commit_hash=commit_hash,
        image_tag=image_tag,
        status=DeploymentStatus.PENDING,
    )
    db.add(deployment)
    db.commit()
    db.refresh(deployment)

    logger.info(f'Webhook triggered deployment {deployment.id}')

    asyncio.create_task(asyncio.to_thread(trigger_deployment, str(deployment.id)))

    return {
        'message': 'Deployment triggered',
        'deployment_id': str(deployment.id),
        'project': project.name
    }
