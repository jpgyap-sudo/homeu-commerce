# Docker Container Architecture & Backup Strategy

> **Status:** Design / Instructions — implement when site is final and live
> **Date:** 2026-06-17

---

## 1. Current Architecture

```
                    VPS (Tailscale 100.64.175.88)
                    ┌──────────────────────────────────┐
 Internet ──► nginx │                                  │
                    │  ┌─────────┐  ┌──────────┐      │
                    │  │ website │  │ postgres │      │
                    │  │ :3000   │  │ :5432    │      │
                    │  └─────────┘  └──────────┘      │
                    │                        │         │
                    │  ┌─────────┐  ┌───────┴──────┐  │
                    │  │ ollama  │  │ postgres_data │  │
                    │  │ :11434  │  │ volume        │  │
                    │  └─────────┘  └──────────────┘  │
                    └──────────────────────────────────┘
```

**Note:** Frontend (`store.homeatelier.ph`) and Backend (`admin.homeatelier.ph`) are the SAME Next.js app — separated by domain routing, proxy auth, and layouts. No need for separate containers.

---

## 2. Proposed Architecture (Production-Ready)

```
                    VPS
                    ┌─────────────────────────────────────────────┐
 Internet ──► nginx │ (SSL, reverse proxy, static caching)        │
                    │                                             │
   store. ──────────┼──► [website:3000]  Next.js App             │
   homeatelier.ph   │    ├── Storefront pages                    │
                    │    ├── Admin panel (/admin/*)              │
   admin. ──────────┼──► │  API routes (/api/*)                  │
   homeatelier.ph   │    └── Proxy (auth gate)                   │
                    │        │         │         │               │
                    │        ▼         ▼         ▼               │
                    │  ┌──────────┐ ┌───────┐ ┌──────────┐      │
                    │  │ postgres │ │ redis │ │  ollama  │      │
                    │  │ :5432    │ │ :6379 │ │  :11434  │      │
                    │  └────┬─────┘ └───────┘ └──────────┘      │
                    │       │                                     │
                    │  ┌────┴─────┐  ┌──────────────┐           │
                    │  │ pg_data  │  │ pg_backups   │           │
                    │  │ volume   │  │ volume (NEW) │           │
                    │  └──────────┘  └──────┬───────┘           │
                    │                       │                    │
                    │  ┌────────────────────┴───────────────┐   │
                    │  │  pgbackup (NEW)                     │   │
                    │  │  Cron: pg_dump every 6h + WAL arch  │   │
                    │  └────────────────────────────────────┘   │
                    └─────────────────────────────────────────────┘

DO Spaces (S3) ←── CDN media backup (already redundant by DO)
```

---

## 3. Docker Compose — Final Layout

```yaml
# docker-compose.prod.yml
services:
  # ── PostgreSQL 16 ──
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: homeu
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: homeu
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - homeu_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U homeu"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ── Redis (session cache + rate limiting) ──
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - homeu_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  # ── Next.js Website (frontend + admin) ──
  website:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_SITE_URL: https://store.homeatelier.ph
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file:
      - .env
    environment:
      DATABASE_URI: postgres://homeu:${DB_PASSWORD}@postgres:5432/homeu
      REDIS_URL: redis://redis:6379
      NEXT_PUBLIC_SITE_URL: https://store.homeatelier.ph
      ADMIN_PUBLIC_SERVER_URL: https://admin.homeatelier.ph
      JWT_SECRET: ${JWT_SECRET}
      DAVINCIOS_SECRET: ${DAVINCIOS_SECRET}
    networks:
      - homeu_network
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ── Ollama AI (optional — for chatbot) ──
  ollama:
    image: ollama/ollama:latest
    restart: unless-stopped
    profiles: ["ai"]
    volumes:
      - ollama_data:/root/.ollama
    networks:
      - homeu_network
    deploy:
      resources:
        limits:
          memory: 8G

  # ── PostgreSQL Backup (scheduled pg_dump) ──
  pgbackup:
    image: postgres:16-alpine
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      PGHOST: postgres
      PGUSER: homeu
      PGPASSWORD: ${DB_PASSWORD}
      PGDATABASE: homeu
      BACKUP_RETENTION_DAYS: 30
    volumes:
      - pg_backups:/backups
      - ./docker/backup.sh:/backup.sh:ro
    entrypoint: ["/bin/sh", "-c"]
    command:
      - |
        echo "0 */6 * * * /backup.sh" > /var/spool/cron/crontabs/root
        crond -f -l 2
    networks:
      - homeu_network

  # ── Watchtower (auto-update Docker images — optional) ──
  watchtower:
    image: containrrr/watchtower:latest
    restart: unless-stopped
    profiles: ["monitoring"]
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 86400 --cleanup website

networks:
  homeu_network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  ollama_data:
  pg_backups:
```

---

## 4. Backup Strategy

### 4.1 What to Back Up

| Asset | Location | Method | Frequency | Retention |
|-------|----------|--------|-----------|-----------|
| **PostgreSQL DB** | VPS container | `pg_dump` + WAL archiving | Every 6 hours | 30 days |
| **Theme CSS** | `public/debut-theme.css` | Git + file copy | On deploy | Forever (in Git) |
| **Theme components** | `src/components/Site*.tsx` | Git | On commit | Forever (in Git) |
| **Navigation data** | `src/data/navigation.json` | Git | On commit | Forever (in Git) |
| **Site config** | `src/data/site-config.json` | Git | On commit | Forever (in Git) |
| **CDN media** | DO Spaces `homeatelierspaces` | Redundant by DO (S3) | N/A | DO managed |
| **Nginx config** | `/etc/nginx/conf.d/homeu.conf` | Copy to Git | On change | Forever (in Git) |
| **SSL certs** | `/etc/letsencrypt/` | Certbot auto-renew | Every 60 days | Auto |
| **Environment** | `.env` files | 1Password / gitignored | On change | Forever |
| **Ollama models** | `ollama_data` volume | Re-downloadable | N/A | Not backed up |

### 4.2 Backup Script

```bash
#!/bin/sh
# docker/backup.sh — runs inside pgbackup container via cron

BACKUP_DIR="/backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
DATE=$(date +%Y-%m-%d_%H-%M)
FILE="${BACKUP_DIR}/homeu_${DATE}.sql.gz"

echo "[$(date)] Starting backup..."

# Full dump with compression
pg_dump --no-owner --no-acl --clean | gzip > "$FILE"

if [ $? -eq 0 ]; then
  echo "[$(date)] Backup complete: $FILE ($(du -h "$FILE" | cut -f1))"
else
  echo "[$(date)] BACKUP FAILED" >&2
  exit 1
fi

# Cleanup old backups
find "$BACKUP_DIR" -name "homeu_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Cleaned backups older than ${RETENTION_DAYS} days"
```

### 4.3 WAL Archiving (Point-in-Time Recovery)

Add to `docker/init.sql`:
```sql
-- Enable WAL archiving for PITR
ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET archive_mode = 'on';
ALTER SYSTEM SET archive_command = 'cp %p /backups/wal/%f';
SELECT pg_reload_conf();
```

### 4.4 Theme Backup

The Debut theme is the most critical asset for visual fidelity. It consists of:

| File | Purpose | Size |
|------|---------|------|
| `public/debut-theme.css` | Compiled Debut CSS from live Shopify store | 184KB |
| `src/styles/theme-tokens.css` | CSS variables from `settings_data.json` | ~2KB |
| `src/styles/debut-overrides.css` | Bridge: Debut class names → HomeU vars | ~2KB |
| `src/components/SiteHeader.tsx` | Debut-compatible header | ~3KB |
| `src/components/SiteFooter.tsx` | Debut-compatible footer | ~2KB |
| `src/data/navigation.json` | Full nav tree with dropdowns | ~3KB |
| `src/data/site-config.json` | Shop metadata, fonts, colors | ~1KB |

**These are all in Git — already backed up by normal workflow.** For extra safety, add a pre-deploy hook:

```bash
# .githooks/pre-push (already exists — verify it copies theme files)
cp apps/website/public/debut-theme.css docker/backup-theme/
cp apps/website/src/data/navigation.json docker/backup-theme/
cp apps/website/src/data/site-config.json docker/backup-theme/
```

---

## 5. Disaster Recovery Plan

### 5.1 Recovery Levels

| Level | Scenario | Recovery Time | What to Do |
|-------|----------|---------------|------------|
| **L1** | Code broke in latest deploy | 5 min | `git revert` + redeploy |
| **L2** | Container crashed, DB fine | 5 min | `docker-compose restart` |
| **L3** | DB corrupted, data center fine | 30 min | Restore latest pg_dump + WAL replay |
| **L4** | VPS lost, DO Spaces ok | 2 hours | New VPS: clone repo, restore DB, `docker-compose up` |
| **L5** | Full disaster | 4 hours | New VPS, restore DB, re-upload CDN media, DNS switch |

### 5.2 Restore Procedure

```bash
# 1. Clone the repo (if VPS lost)
git clone <repo-url> /opt/homeu-commerce
cd /opt/homeu-commerce

# 2. Copy .env from backup (stored in 1Password / secure location)
cp /secure/backup/.env .

# 3. Restore PostgreSQL
docker compose -f docker-compose.prod.yml up -d postgres
# Wait for health check
gunzip -c /backups/homeu_LATEST.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U homeu

# 4. Start all services
docker compose -f docker-compose.prod.yml up -d

# 5. Verify
curl -s -o /dev/null -w "%{http_code}" https://store.homeatelier.ph
curl -s -o /dev/null -w "%{http_code}" https://admin.homeatelier.ph/admin/login

# 6. Restore SSL (if VPS lost)
# Certbot will auto-renew, but you may need to run initially:
docker run --rm -v /etc/letsencrypt:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d store.homeatelier.ph -d admin.homeatelier.ph
```

### 5.3 Git-Based Code Recovery (Fastest)

```bash
# If code is broken but DB is fine — just revert the bad commit
git log --oneline -10                      # find the bad commit
git revert <bad-commit-sha>                # create revert commit
git push
# Deployer agent auto-deploys

# Or rollback to a known-good Docker image
docker tag homeu-website:previous homeu-website:rollback
docker compose up -d website
```

---

## 6. Monitoring & Alerts

### 6.1 Health Checks (built into docker-compose)

| Service | Check | Interval |
|---------|-------|----------|
| postgres | `pg_isready` | 10s |
| redis | `redis-cli ping` | 10s |
| website | `wget /api` | 30s |
| pgbackup | Log check | Manual (cron) |

### 6.2 Key Metrics to Monitor

- Disk usage on `postgres_data` volume
- Disk usage on `pg_backups` volume
- PostgreSQL connection count
- Next.js error rate (central-logger)
- SSL certificate expiry date
- DO Spaces bucket size

### 6.3 Backup Verification

Run weekly to ensure backups are valid:
```bash
# Test restore to a temp database
docker compose exec pgbackup sh -c "
  gunzip -c /backups/homeu_LATEST.sql.gz | psql -h postgres -U homeu -d homeu_backup_test
"
# Check row counts
docker compose exec postgres psql -U homeu -d homeu_backup_test \
  -c "SELECT count(*) FROM products;"
# Drop test DB
docker compose exec postgres psql -U homeu \
  -c "DROP DATABASE homeu_backup_test;"
```

---

## 7. Container Resource Allocation

| Service | CPU | RAM | Disk | Notes |
|---------|-----|-----|------|-------|
| postgres | 2 cores | 2 GB | 20 GB (volume) | Grows with products/media metadata |
| website | 2 cores | 1 GB | 1 GB (image) | Next.js standalone |
| redis | 0.5 cores | 256 MB | 1 GB (volume) | Session cache only |
| ollama | 4 cores | 8 GB | 20 GB (volume) | Models are large |
| pgbackup | 0.5 cores | 256 MB | 10 GB (volume) | Compressed backups |
| **Total** | ~9 cores | ~12 GB | ~52 GB | Ollama optional (-8 GB) |

---

## 8. Implementation Checklist

- [ ] Add `redis` service to `docker-compose.yml`
- [ ] Add `pgbackup` service with cron
- [ ] Create `docker/backup.sh` script
- [ ] Create `docker/init.sql` with WAL archiving
- [ ] Update `Dockerfile` for production optimizations (compress static assets)
- [ ] Add health checks to all services
- [ ] Test backup → restore on staging
- [ ] Set up backup verification cron job
- [ ] Store `.env` in secure vault (1Password)
- [ ] Document restore procedure in `docs/disaster-recovery.md`
- [ ] Update nginx config with `homeatelier.ph` domains
- [ ] Add `pre-push` hook to copy theme files to backup location
