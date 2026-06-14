# Security Audit Skill

Audit the HomeU project for security vulnerabilities.

## Commands

### Check for committed secrets
```bash
cd /opt/homeu-commerce
git ls-files | xargs grep -l "sk_live\|shpat_\|ghp_\|AIza\|-----BEGIN" 2>/dev/null || echo "No secrets found"
```

### Check security headers
```bash
curl -sI https://store.homeu.ph | grep -iE "strict-transport|x-frame|x-content|x-xss"
```

### Check SSL expiry
```bash
echo | openssl s_client -servername store.homeu.ph -connect store.homeu.ph:443 2>/dev/null | openssl x509 -noout -dates
```

### Check exposed ports
```bash
ss -tlnp | grep -E ":(80|443|5432|3000|6379)"
```

### Check Payload security config
```bash
grep -E "cors|csrf|cookiePrefix|secret" apps/website/src/payload.config.ts
```

### npm audit
```bash
docker exec homeu-commerce-website-1 npm audit
```

## Scan Results Log
Save to `docs/SECURITY_AUDIT.md` with date, findings, and fixes.
