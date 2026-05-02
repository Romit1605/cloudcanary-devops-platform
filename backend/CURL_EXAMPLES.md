# CloudCanary API Examples

## Create Project
curl -X POST http://localhost:8000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "test-project", "repo_url": "https://github.com/user/test-project", "branch": "main", "health_url": "http://localhost:8080/health"}'

## Get Projects
curl -X GET http://localhost:8000/api/projects

## Create Deployment
curl -X POST http://localhost:8000/api/deployments \
  -H "Content-Type: application/json" \
  -d '{"project_id": "<PROJECT_ID>", "commit_hash": "a1b2c3d4", "image_tag": "v1.0.0"}'

## Get Deployments
curl -X GET http://localhost:8000/api/deployments

## Rollback Deployment
curl -X POST http://localhost:8000/api/deployments/<DEPLOYMENT_ID>/rollback

## Get Deployment Logs
curl -X GET http://localhost:8000/api/deployments/<DEPLOYMENT_ID>/logs

## Trigger Webhook
curl -X POST http://localhost:8000/api/webhooks/github \
  -H "Content-Type: application/json" \
  -d '{"repository": "https://github.com/user/test-project", "branch": "main", "commit": "def5678", "image": "v1.0.1"}'
