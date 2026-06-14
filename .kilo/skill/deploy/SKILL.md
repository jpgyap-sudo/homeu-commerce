# Deploy Skill

Deploy, manage, and rollback the HomeU project on the VPS.

## VPS Connection (Tailscale)
```
Host:      ubuntu-s-4vcpu-16gb-amd-nyc1
Tailscale: 100.64.175.88
User:      root
SSH Key:   C:\Users\User\.ssh\id_superroo_vps
```

## Commands

### Build and Deploy
```bash
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" root@100.64.175.88 \
  "cd /opt/homeu-commerce && git pull && docker compose build && docker compose up -d"
```

### Check Status
```bash
ssh -i "$SSH_KEY" root@100.64.175.88 "docker compose ps"
```

### View Logs
```bash
ssh -i "$SSH_KEY" root@100.64.175.88 "docker compose logs --tail=50 website"
```

### Health Check
```bash
curl -s -o /dev/null -w '%{http_code}' https://store.homeu.ph/
curl -s -o /dev/null -w '%{http_code}' https://admin.homeu.ph/
```

### SSL Renew
```bash
certbot renew
```

### Rollback
```bash
# Revert to previous git tag
cd /opt/homeu-commerce
git checkout v0.1-vps-baseline
docker compose build --no-cache
docker compose up -d
```

## Approval Gate
All deploy operations require user approval via `tools/shared/approval.mjs`.
