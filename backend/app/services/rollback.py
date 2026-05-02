import logging
from datetime import datetime, timezone
import time
from app.database import SessionLocal
from app.models.deployment import Deployment, DeploymentStatus
from app.models.log import DeploymentLog

logger = logging.getLogger('cloudcanary.services.rollback')

def _add_log(db, deployment_id: str, message: str):
    log = DeploymentLog(
        deployment_id=deployment_id,
        message=message,
    )
    db.add(log)
    db.commit()
    logger.info(message)

def perform_rollback(deployment_id: str):
    db = SessionLocal()
    try:
        deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
        if not deployment:
            logger.error('Deployment not found')
            return False

        _add_log(db, deployment.id, 'Initiating manual rollback simulation...')
        
        deployment.status = DeploymentStatus.ROLLED_BACK
        deployment.rollback_reason = 'Manual rollback triggered'
        deployment.is_stable = False
        deployment.finished_at = datetime.now(timezone.utc)
        db.commit()
        
        _add_log(db, deployment.id, 'Rollback completed successfully.')
        return True
    except Exception as e:
        logger.exception('Rollback failed')
        return False
    finally:
        db.close()
