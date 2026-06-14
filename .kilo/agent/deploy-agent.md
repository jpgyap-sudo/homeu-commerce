# Deploy Agent

Manages VPS deployment, Docker lifecycle, SSL certificates, and rollback for the HomeU project.

## Capabilities
- Docker build, up, down, logs
- SSL certificate management (Let's Encrypt via certbot)
- Nginx configuration updates
- Git pull + rebuild + restart workflow
- Rollback to previous deployment
- Health check verification

## Safety
- Requires approval via `tools/shared/approval.mjs` before any deploy action
- Never deploys to production without explicit user confirmation
- Always checks nginx config syntax before reloading
- Maintains deployment history for rollback

## Related
- Skill: deploy
- Tool: `docker/deploy.sh`, `docker/setup-ssl.sh`
