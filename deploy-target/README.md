# CloudCanary — Deployment Engine

This directory contains the **CloudCanary deployment engine**: a set of shell scripts
that deploy Docker images, verify their health, and automatically roll back to the last
known-stable version when health checks fail.

---

## Files

| File | Purpose |
|---|---|
| `deploy.sh` | Pull an image, replace the container, health-check, auto-rollback on failure |
| `healthcheck.sh` | Poll a URL until HTTP 200 or exhausted retries |
| `rollback.sh` | Restore the last stable image for a container |
| `docker-compose.app.yml` | Starter Compose file for manual / test deployments |
| `.env.example` | Template for environment variables; copy to `.env` |
| `.state/` | Auto-created directory storing per-container state for rollback |

---

## What Each Script Does

### `deploy.sh`

1. Pulls the specified Docker image from the registry.
2. Saves the current stable image tag to `.state/<container-name>.env` (for rollback).
3. Stops and removes the existing container (if any).
4. Starts the new container with the pulled image (injects `.env` if present).
5. Waits 3 seconds for the container to initialise.
6. Calls `healthcheck.sh` — if it returns HTTP 200 the new image becomes the stable version.
7. If the health check fails, calls `rollback.sh` automatically and exits with code 1.

### `healthcheck.sh`

- Accepts a single URL argument.
- Sends `curl` requests up to **5 times** with a **5-second delay** between attempts.
- Succeeds (`exit 0`) only when the server returns **HTTP 200**.
- Fails (`exit 1`) if all retries are exhausted without a 200 response.
- Prints a timestamped result for every attempt.

### `rollback.sh`

1. Reads `.state/<container-name>.env` to find the last stable image tag.
2. Stops and removes the currently running (failed) container.
3. Starts a new container using the stable image tag.
4. Updates the state file to reflect the restored state.
5. Exits with code 0 on success, 1 if no stable image was recorded.

---

## Prerequisites

- Docker Engine installed on the deployment host.
- `curl` available in the shell.
- Scripts must be executable:

```bash
chmod +x deploy-target/deploy.sh
chmod +x deploy-target/healthcheck.sh
chmod +x deploy-target/rollback.sh
```

---

## Quick Start — Manual Test Commands

### 1. Set up environment

```bash
cd deploy-target
cp .env.example .env
# Edit .env with your application's environment variables
```

### 2. Deploy an image

```bash
# deploy.sh <project-name> <image-tag> <container-name> <host-port>
./deploy.sh demo-app nginx:1.25 demo-container 8080
```

Expected output (abbreviated):
```
[2026-05-02 10:00:00] [DEPLOY] === CloudCanary Deployment Engine — deploy.sh ===
[2026-05-02 10:00:00] [DEPLOY] STEP 1 — Pulling image: nginx:1.25
[2026-05-02 10:00:05] [DEPLOY] STEP 5 — Running health check.
[2026-05-02 10:00:05] [HEALTH] Attempt 1/5 — GET http://localhost:8080/health
[2026-05-02 10:00:05] [HEALTH] Response: HTTP 200
[2026-05-02 10:00:05] [DEPLOY] === DEPLOY SUCCESS — nginx:1.25 is live and healthy. ===
```

### 3. Check container is running

```bash
docker ps --filter "name=demo-container"
```

### 4. Run health check manually

```bash
./healthcheck.sh http://localhost:8080/health
```

### 5. Manual rollback

```bash
# rollback.sh <project-name> <container-name> <host-port>
./rollback.sh demo-app demo-container 8080
```

Expected output (abbreviated):
```
[2026-05-02 10:01:00] [ROLLBACK] STEP 1 — Reading rollback state.
[2026-05-02 10:01:00] [ROLLBACK] Current image : nginx:1.26
[2026-05-02 10:01:00] [ROLLBACK] Stable image  : nginx:1.25
[2026-05-02 10:01:01] [ROLLBACK] ROLLBACK SUCCESS
```

### 6. Using docker-compose.app.yml

```bash
# Start
APP_IMAGE=nginx:latest CONTAINER_NAME=demo-container HOST_PORT=8080 CONTAINER_PORT=80 \
  docker compose -f docker-compose.app.yml up -d

# Stop
docker compose -f docker-compose.app.yml down
```

---

## Example Deploy Flow

```
User clicks "Deploy Now" in CloudCanary dashboard
        ↓
FastAPI backend creates a Deployment record (status = DEPLOYING)
        ↓
backend/services/deploy.py calls deploy.sh via subprocess
        ↓
deploy.sh:
  1. docker pull myapp:abc1234
  2. saves previous stable image to .state/myapp-container.env
  3. docker stop / docker rm myapp-container
  4. docker run -d --name myapp-container -p 8080:8080 myapp:abc1234
  5. healthcheck.sh http://localhost:8080/health  → HTTP 200 ✓
  6. promotes myapp:abc1234 as new STABLE_IMAGE
        ↓
FastAPI backend updates Deployment record (status = SUCCESS, is_stable = True)
        ↓
Dashboard shows green SUCCESS badge
```

---

## Example Rollback Flow

```
Scenario: new image fails health check  OR  user manually clicks "Rollback"
        ↓
FastAPI backend calls rollback.sh via subprocess (or deploy.sh triggers it automatically)
        ↓
rollback.sh:
  1. reads .state/myapp-container.env → STABLE_IMAGE=myapp:prev123
  2. docker stop myapp-container (the bad new version)
  3. docker rm myapp-container
  4. docker run -d --name myapp-container -p 8080:8080 myapp:prev123
  5. writes updated state file
        ↓
FastAPI backend updates Deployment record (status = ROLLED_BACK)
        ↓
Dashboard shows orange ROLLED_BACK badge
```

---

## FastAPI Backend Integration

The scripts are designed to be called from Python using `subprocess.run`.

### deploy.py (service layer)

```python
import subprocess

def trigger_deployment_script(
    project_name: str,
    image_tag: str,
    container_name: str,
    host_port: int,
) -> tuple[bool, str]:
    """Call deploy.sh and return (success, logs)."""
    result = subprocess.run(
        [
            "/deploy-target/deploy.sh",
            project_name,
            image_tag,
            container_name,
            str(host_port),
        ],
        capture_output=True,
        text=True,
        timeout=180,     # 3 min max — accounts for image pull + health retries
    )
    logs = result.stdout + result.stderr
    return result.returncode == 0, logs
```

### rollback.py (service layer)

```python
import subprocess

def trigger_rollback_script(
    project_name: str,
    container_name: str,
    host_port: int,
) -> tuple[bool, str]:
    """Call rollback.sh and return (success, logs)."""
    result = subprocess.run(
        [
            "/deploy-target/rollback.sh",
            project_name,
            container_name,
            str(host_port),
        ],
        capture_output=True,
        text=True,
        timeout=60,
    )
    logs = result.stdout + result.stderr
    return result.returncode == 0, logs
```

### health_check.py (service layer)

```python
import subprocess

def check_health(health_url: str) -> tuple[bool, str]:
    """Call healthcheck.sh and return (healthy, logs)."""
    result = subprocess.run(
        ["/deploy-target/healthcheck.sh", health_url],
        capture_output=True,
        text=True,
        timeout=60,    # 5 retries × (5s delay + 10s timeout) = 75s max
    )
    logs = result.stdout + result.stderr
    return result.returncode == 0, logs
```

---

## Directory Structure (auto-generated at runtime)

```
deploy-target/
  deploy.sh               ← deploy engine
  healthcheck.sh          ← health poller
  rollback.sh             ← rollback engine
  docker-compose.app.yml  ← convenience Compose template
  .env.example            ← environment variable template
  .env                    ← local environment variables (gitignored)
  .state/
    <container-name>.env  ← per-container stable/current image state
```

## Notes

- `.state/` and `.env` are created at runtime and should be **gitignored**.
- In production the scripts run on the Docker host; the backend calls them over SSH or via a mounted volume.
- Scripts use `set -euo pipefail` for safe error handling — any unexpected failure aborts immediately.
- Port mapping is `HOST_PORT:HOST_PORT` (1-to-1) by default; edit the `docker run` line in `deploy.sh` if your container listens on a different internal port.
