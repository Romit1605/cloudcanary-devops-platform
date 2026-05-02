# Deploy Target

This directory is the **deployment workspace** where CloudCanary clones repositories,
builds Docker images, and manages running containers for deployed projects.

## Structure (auto-generated at runtime)

```
deploy-target/
  <project-name>/
    repo/          ← cloned git repository
    docker/        ← built images and compose files
    logs/          ← deployment logs
```

## Notes

- This directory is mounted into the backend container.
- In production, this would be on a dedicated deployment server.
- Each project gets its own isolated subdirectory.
- Old images are cleaned up after successful rollback or configurable retention.
