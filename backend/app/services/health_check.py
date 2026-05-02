"""
Health check service — verifies that a deployed container is responding.
"""

import logging
import time
import requests

logger = logging.getLogger("cloudcanary.services.health_check")


def run_health_check(url: str, retries: int = 3, interval: int = 10) -> bool:
    """
    Perform HTTP health checks against a deployed service.

    Args:
        url: The health check URL to probe.
        retries: Number of attempts before declaring unhealthy.
        interval: Seconds to wait between retries.

    Returns:
        True if the service responds with 2xx, False otherwise.
    """
    for attempt in range(1, retries + 1):
        try:
            logger.info(f"Health check attempt {attempt}/{retries}: GET {url}")
            response = requests.get(url, timeout=10)

            if 200 <= response.status_code < 300:
                logger.info(f"Health check passed (status {response.status_code})")
                return True
            else:
                logger.warning(f"Health check returned status {response.status_code}")

        except requests.RequestException as e:
            logger.warning(f"Health check attempt {attempt} failed: {e}")

        if attempt < retries:
            logger.info(f"Retrying in {interval}s...")
            time.sleep(interval)

    logger.error(f"Health check failed after {retries} attempts")
    return False
