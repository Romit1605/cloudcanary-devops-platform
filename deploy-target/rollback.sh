#!/usr/bin/env bash
# =============================================================================
# CloudCanary — rollback.sh
# =============================================================================
# Restore the last known-stable Docker image for a container.
# Called automatically by deploy.sh when a health check fails, or manually
# from the CloudCanary dashboard (FastAPI triggers it via subprocess).
#
# Usage:
#   ./rollback.sh <project-name> <container-name> <exposed-port>
#
# Example:
#   ./rollback.sh myapp myapp-container 8080
#
# Exit codes:
#   0 — rollback succeeded
#   1 — rollback failed (no stable image recorded, or Docker error)
#
# -----------------------------------------------------------------------------
# FastAPI subprocess integration (called from backend/app/services/rollback.py):
#
#   import subprocess
#
#   result = subprocess.run(
#       ["/deploy-target/rollback.sh", project_name, container_name, str(port)],
#       capture_output=True, text=True, timeout=120
#   )
#   success = result.returncode == 0
#   logs    = result.stdout + result.stderr
#
# -----------------------------------------------------------------------------

set -euo pipefail

# ---------- Arguments --------------------------------------------------------
PROJECT_NAME="${1:?'ERROR: Missing project-name.  Usage: rollback.sh <project-name> <container-name> <exposed-port>'}"
CONTAINER_NAME="${2:?'ERROR: Missing container-name.'}"
EXPOSED_PORT="${3:?'ERROR: Missing exposed-port.'}"

# ---------- Paths ------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="${SCRIPT_DIR}/.state"
STATE_FILE="${STATE_DIR}/${CONTAINER_NAME}.env"

# ---------- Logging ----------------------------------------------------------
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ROLLBACK] $*"
}

log "========================================================"
log "  CloudCanary Rollback Engine — rollback.sh"
log "========================================================"
log "  Project   : ${PROJECT_NAME}"
log "  Container : ${CONTAINER_NAME}"
log "  Port      : ${EXPOSED_PORT}"
log "========================================================"

# ---------- Step 1: Load state file ------------------------------------------
log "STEP 1 — Reading rollback state."

if [[ ! -f "${STATE_FILE}" ]]; then
    log "ERROR: No state file found at '${STATE_FILE}'."
    log "Cannot roll back — no previous deployment state recorded."
    exit 1
fi

# shellcheck source=/dev/null
source "${STATE_FILE}"

STABLE_IMAGE="${STABLE_IMAGE:-}"
CURRENT_IMAGE="${CURRENT_IMAGE:-}"

log "Current image : ${CURRENT_IMAGE:-<unknown>}"
log "Stable image  : ${STABLE_IMAGE:-<none>}"

if [[ -z "${STABLE_IMAGE}" ]]; then
    log "========================================================"
    log "  ROLLBACK ABORTED — no stable image recorded."
    log "  This was likely the very first deployment."
    log "========================================================"
    exit 1
fi

if [[ "${STABLE_IMAGE}" == "${CURRENT_IMAGE}" ]]; then
    log "WARNING: Stable and current image are the same (${STABLE_IMAGE})."
    log "Nothing to roll back to. Aborting."
    exit 1
fi

# ---------- Step 2: Stop / remove current (failed) container -----------------
log "STEP 2 — Stopping failed container."

if docker ps -a --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
    log "Stopping container: ${CONTAINER_NAME}"
    docker stop "${CONTAINER_NAME}" || true
    log "Removing container: ${CONTAINER_NAME}"
    docker rm   "${CONTAINER_NAME}" || true
    log "Failed container removed."
else
    log "Container '${CONTAINER_NAME}' is not running — nothing to stop."
fi

# ---------- Step 3: Start previous stable container --------------------------
log "STEP 3 — Starting previous stable image: ${STABLE_IMAGE}"

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

DOCKER_ARGS+=("${STABLE_IMAGE}")

docker run "${DOCKER_ARGS[@]}"
log "Container '${CONTAINER_NAME}' started with stable image '${STABLE_IMAGE}'."

# ---------- Step 4: Update state file ----------------------------------------
log "STEP 4 — Updating state to reflect rollback."

cat > "${STATE_FILE}" <<EOF
# CloudCanary state file — managed automatically, do not edit by hand.
# Rollback performed on $(date '+%Y-%m-%d %H:%M:%S')
STABLE_IMAGE=${STABLE_IMAGE}
CURRENT_IMAGE=${STABLE_IMAGE}
CONTAINER_NAME=${CONTAINER_NAME}
EXPOSED_PORT=${EXPOSED_PORT}
PROJECT_NAME=${PROJECT_NAME}
EOF

log "========================================================"
log "  ROLLBACK SUCCESS"
log "  Container '${CONTAINER_NAME}' is now running '${STABLE_IMAGE}'."
log "========================================================"
exit 0
