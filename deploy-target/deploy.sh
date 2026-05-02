#!/usr/bin/env bash
# =============================================================================
# CloudCanary — deploy.sh
# =============================================================================
# Pull a Docker image, replace the running container, run a health check, and
# automatically trigger rollback if the health check fails.
#
# Usage:
#   ./deploy.sh <project-name> <image-tag> <container-name> <exposed-port>
#
# Example:
#   ./deploy.sh myapp nginx:1.25 myapp-container 8080
#
# -----------------------------------------------------------------------------
# FastAPI subprocess integration (called from backend/app/services/deploy.py):
#
#   import subprocess, shlex
#
#   cmd = [
#       "/deploy-target/deploy.sh",
#       project_name,   # e.g. "myapp"
#       image_tag,      # e.g. "myrepo/myapp:abc1234"
#       container_name, # e.g. "cloudcanary-myapp"
#       str(host_port), # e.g. "8080"
#   ]
#   result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
#   success = result.returncode == 0
#   logs    = result.stdout + result.stderr
#
# -----------------------------------------------------------------------------

set -euo pipefail

# ---------- Arguments --------------------------------------------------------
PROJECT_NAME="${1:?'ERROR: Missing project-name.  Usage: deploy.sh <project-name> <image-tag> <container-name> <exposed-port>'}"
IMAGE_TAG="${2:?'ERROR: Missing image-tag.'}"
CONTAINER_NAME="${3:?'ERROR: Missing container-name.'}"
EXPOSED_PORT="${4:?'ERROR: Missing exposed-port.'}"

# ---------- Paths -------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="${SCRIPT_DIR}/.state"
STATE_FILE="${STATE_DIR}/${CONTAINER_NAME}.env"
mkdir -p "${STATE_DIR}"

# ---------- Logging -----------------------------------------------------------
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [DEPLOY] $*"
}

log "========================================================"
log "  CloudCanary Deployment Engine — deploy.sh"
log "========================================================"
log "  Project   : ${PROJECT_NAME}"
log "  Image     : ${IMAGE_TAG}"
log "  Container : ${CONTAINER_NAME}"
log "  Port      : ${EXPOSED_PORT}"
log "========================================================"

# ---------- Step 1: Pull image -----------------------------------------------
log "STEP 1 — Pulling image: ${IMAGE_TAG}"
if ! docker pull "${IMAGE_TAG}"; then
    log "ERROR: Failed to pull image '${IMAGE_TAG}'. Aborting deploy."
    exit 1
fi
log "Image pulled successfully."

# ---------- Step 2: Save current stable state for rollback -------------------
log "STEP 2 — Saving rollback state."
PREV_STABLE_IMAGE=""
if [[ -f "${STATE_FILE}" ]]; then
    # shellcheck source=/dev/null
    source "${STATE_FILE}"
    PREV_STABLE_IMAGE="${STABLE_IMAGE:-}"
    log "Previous stable image: ${PREV_STABLE_IMAGE:-<none>}"
else
    log "No previous state found. This is a first-time deploy."
fi

# Write pre-deploy state (stable = previous, current = incoming image)
# rollback.sh will read STABLE_IMAGE to know what to restore.
cat > "${STATE_FILE}" <<EOF
# CloudCanary state file — managed automatically, do not edit by hand.
# Updated by deploy.sh on $(date '+%Y-%m-%d %H:%M:%S')
STABLE_IMAGE=${PREV_STABLE_IMAGE}
CURRENT_IMAGE=${IMAGE_TAG}
CONTAINER_NAME=${CONTAINER_NAME}
EXPOSED_PORT=${EXPOSED_PORT}
PROJECT_NAME=${PROJECT_NAME}
EOF
log "State file written: ${STATE_FILE}"

# ---------- Step 3: Stop / remove existing container -------------------------
log "STEP 3 — Replacing existing container (if any)."
if docker ps -a --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
    log "Stopping container: ${CONTAINER_NAME}"
    docker stop "${CONTAINER_NAME}" || true
    log "Removing container: ${CONTAINER_NAME}"
    docker rm   "${CONTAINER_NAME}" || true
    log "Old container removed."
else
    log "No existing container named '${CONTAINER_NAME}' found."
fi

# ---------- Step 4: Start new container --------------------------------------
log "STEP 4 — Starting new container."

# Build docker run argument array (supports optional .env file)
DOCKER_ARGS=(
    -d
    --name "${CONTAINER_NAME}"
    --restart unless-stopped
    -p "${EXPOSED_PORT}:${EXPOSED_PORT}"
)

if [[ -f "${SCRIPT_DIR}/.env" ]]; then
    log "Found .env file — injecting environment variables."
    DOCKER_ARGS+=(--env-file "${SCRIPT_DIR}/.env")
fi

DOCKER_ARGS+=("${IMAGE_TAG}")

docker run "${DOCKER_ARGS[@]}"
log "Container '${CONTAINER_NAME}' started with image '${IMAGE_TAG}'."

# ---------- Step 5: Health check ---------------------------------------------
log "STEP 5 — Running health check."
HEALTH_URL="http://localhost:${EXPOSED_PORT}/health"
log "Health URL: ${HEALTH_URL}"

# Give the container a moment to initialise before checking
sleep 3

if "${SCRIPT_DIR}/healthcheck.sh" "${HEALTH_URL}"; then
    log "========================================================"
    log "  Health check PASSED."
    log "  Marking '${IMAGE_TAG}' as the new stable image."
    log "========================================================"

    # Promote current image to stable
    cat > "${STATE_FILE}" <<EOF
# CloudCanary state file — managed automatically, do not edit by hand.
# Updated by deploy.sh on $(date '+%Y-%m-%d %H:%M:%S')
STABLE_IMAGE=${IMAGE_TAG}
CURRENT_IMAGE=${IMAGE_TAG}
CONTAINER_NAME=${CONTAINER_NAME}
EXPOSED_PORT=${EXPOSED_PORT}
PROJECT_NAME=${PROJECT_NAME}
EOF
    log "=== DEPLOY SUCCESS — ${IMAGE_TAG} is live and healthy. ==="
    exit 0
else
    log "========================================================"
    log "  Health check FAILED after all retries."
    log "  Initiating automatic rollback..."
    log "========================================================"

    "${SCRIPT_DIR}/rollback.sh" "${PROJECT_NAME}" "${CONTAINER_NAME}" "${EXPOSED_PORT}"
    log "=== DEPLOY FAILED — rolled back to previous stable image. ==="
    exit 1
fi
