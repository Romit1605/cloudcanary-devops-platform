"""
Application configuration loaded from environment variables.
"""

import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    APP_NAME: str = "CloudCanary"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql://cloudcanary:cloudcanary@localhost:5432/cloudcanary"

    # GitHub
    GITHUB_WEBHOOK_SECRET: str = ""
    GITHUB_TOKEN: str = ""

    # Deployment
    DEPLOY_TARGET_DIR: str = "/opt/cloudcanary/deployments"
    HEALTH_CHECK_INTERVAL: int = 10  # seconds
    HEALTH_CHECK_RETRIES: int = 3
    ROLLBACK_ON_FAILURE: bool = True

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
