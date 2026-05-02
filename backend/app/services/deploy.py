import logging
from datetime import datetime, timezone
import time
from app.database import SessionLocal
from app.models.deployment import Deployment, DeploymentStatus
from app.models.log import DeploymentLog
from app.config import get_settings

logger = logging.getLogger('cloudcanary.services.deploy')
settings = get_settings()

def _add_log(db, deployment_id: str, message: str):
    log = DeploymentLog(
        deployment_id=deployment_id,
        message=message,
    )
    db.add(log)
    db.commit()
    logger.info(message)

def trigger_deployment(deployment_id: str):
    db = SessionLocal()
    try:
        deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
        if not deployment:
            logger.error(f'Deployment {deployment_id} not found')
            return

        project = deployment.project
        _add_log(db, deployment_id, f'Starting deployment for {project.name}')

        deployment.status = DeploymentStatus.DEPLOYING
        db.commit()
        
        _add_log(db, deployment_id, f'Deploying image from {project.repo_url} @ {deployment.commit_hash or project.branch}')
        
        image_tag = f'cloudcanary/{project.name}:{deployment.commit_hash or "latest"}'
        deployment.image_tag = image_tag
        db.commit()

        # Simulate deployment time
        time.sleep(2)
        
        _add_log(db, deployment_id, 'Container started successfully')
        
        deployment.status = DeploymentStatus.SUCCESS
        deployment.is_stable = True
        deployment.finished_at = datetime.now(timezone.utc)
        db.commit()
        _add_log(db, deployment_id, f'Deployment {deployment.id} is SUCCESS')
        
    except Exception as e:
        logger.exception(f'Deployment {deployment_id} failed with exception')
        try:
            deployment.status = DeploymentStatus.FAILED
            deployment.rollback_reason = str(e)
            deployment.finished_at = datetime.now(timezone.utc)
            db.commit()
            _add_log(db, deployment_id, f'Exception: {e}')
        except Exception:
            pass
    finally:
        db.close()
