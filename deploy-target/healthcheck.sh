#!/usr/bin/env bash
# =============================================================================
# CloudCanary — healthcheck.sh
# =============================================================================
# Poll a URL until it returns HTTP 200.  Used by deploy.sh after starting a
# new container to confirm it is healthy before promoting it to "stable".
#
# Usage:
#   ./healthcheck.sh <health-url>
#
# Example:
#   ./healthcheck.sh http://localhost:8080/health
#
# Exit codes:
#   0 — health check passed (HTTP 200 received within allowed retries)
#   1 — health check failed (no HTTP 200 after all retries)
#
# -----------------------------------------------------------------------------
# FastAPI subprocess integration (called from backend/app/services/health_check.py):
#
#   import subprocess
#
#   result = subprocess.run(
#       ["/deploy-target/healthcheck.sh", health_url],
#       capture_output=True, text=True, timeout=60
#   )
#   is_healthy = result.returncode == 0
#
# -----------------------------------------------------------------------------

set -uo pipefail

# ---------- Arguments --------------------------------------------------------
HEALTH_URL="${1:?'ERROR: Missing health-url.  Usage: healthcheck.sh <health-url>'}"

# ---------- Configuration ----------------------------------------------------
MAX_RETRIES=5       # number of attempts before giving up
RETRY_DELAY=5       # seconds to wait between attempts
HTTP_TIMEOUT=10     # seconds to wait for each HTTP response

# ---------- Logging -----------------------------------------------------------
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [HEALTH] $*"
}

log "========================================================"
log "  CloudCanary Health Check — healthcheck.sh"
log "========================================================"
log "  URL      : ${HEALTH_URL}"
log "  Retries  : ${MAX_RETRIES}"
log "  Delay    : ${RETRY_DELAY}s"
log "  Timeout  : ${HTTP_TIMEOUT}s per attempt"
log "========================================================"

# ---------- Retry loop -------------------------------------------------------
ATTEMPT=0
while [[ ${ATTEMPT} -lt ${MAX_RETRIES} ]]; do
    ATTEMPT=$(( ATTEMPT + 1 ))
    log "Attempt ${ATTEMPT}/${MAX_RETRIES} — GET ${HEALTH_URL}"

    HTTP_STATUS=$(
        curl \
            --silent \
            --output /dev/null \
            --write-out "%{http_code}" \
            --max-time "${HTTP_TIMEOUT}" \
            "${HEALTH_URL}" 2>/dev/null \
        || echo "000"
    )

    log "Response: HTTP ${HTTP_STATUS}"

    if [[ "${HTTP_STATUS}" == "200" ]]; then
        log "========================================================"
        log "  HEALTH CHECK PASSED — HTTP 200 on attempt ${ATTEMPT}."
        log "========================================================"
        exit 0
    fi

    if [[ ${ATTEMPT} -lt ${MAX_RETRIES} ]]; then
        log "Not healthy yet (HTTP ${HTTP_STATUS}). Retrying in ${RETRY_DELAY}s..."
        sleep "${RETRY_DELAY}"
    fi
done

# ---------- All retries exhausted --------------------------------------------
log "========================================================"
log "  HEALTH CHECK FAILED — no HTTP 200 after ${MAX_RETRIES} attempts."
log "  Last response: HTTP ${HTTP_STATUS}"
log "========================================================"
exit 1
