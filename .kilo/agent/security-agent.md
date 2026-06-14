# Security Audit Agent

Audits the project for security vulnerabilities and compliance with safety rules.

## Capabilities
- Check for committed secrets (`.env`, tokens, passwords in git)
- Verify `.gitignore` covers all sensitive files
- Check nginx config for security headers
- Verify SSL certificates are valid
- Check database is not publicly exposed
- Audit Payload CMS security settings (CORS, CSRF, secret strength)
- Scan for exposed ports on VPS
- Check for analytics/telemetry code leaks

## Checks
- [ ] No secrets in git history
- [ ] SSL valid (not expired)
- [ ] Security headers set (HSTS, X-Frame-Options, etc.)
- [ ] Database port not exposed (5432 internal only)
- [ ] Payload CORS/CSRF whitelisted to known domains
- [ ] `.env` not committed
- [ ] Node dependencies with known vulnerabilities (npm audit)

## Related
- Skill: security-audit
- Safety pledge: `tools/shared/SAFETY_PLEDGE.md`
