# Pre-Deploy Security Checklist

Comprehensive pre-deployment security validation. Includes all quick-secrets checks plus dependency and configuration review.

## Checks

### 1. Quick Secrets (run quick-secrets checklist first)
- [ ] All quick-secrets checks pass

### 2. Dependencies
- [ ] Run `npm audit` (or equivalent) and check for known vulnerabilities
- [ ] Verify no `*` version ranges in `package.json`
- [ ] Check for deprecated packages: `npm outdated`
- [ ] Verify lockfile is present (`package-lock.json` or `bun.lockb`)
- [ ] Review any `overrides` or `resolutions` in package.json

### 3. Environment Variables
- [ ] List all env vars referenced in code: `grep -r 'process.env\.' src/`
- [ ] Verify each has a corresponding entry in `.env.example` or documentation
- [ ] Check for default values that could be dangerous in production
- [ ] Verify no secrets in environment variable defaults

### 4. CORS and Headers
- [ ] Check CORS configuration: search for `cors`, `Access-Control-Allow`
- [ ] Verify allowed origins are not `*` in production
- [ ] Check for `X-Frame-Options`, `X-Content-Type-Options` headers
- [ ] Verify CSP headers if applicable

### 5. HTTP Security
- [ ] Check all API endpoints use appropriate HTTP methods
- [ ] Verify no sensitive data in URL parameters (use request body)
- [ ] Check for rate limiting configuration
- [ ] Verify HTTPS enforcement

### 6. File Uploads
- [ ] Check file upload endpoints for size limits
- [ ] Verify file type validation (not just client-side)
- [ ] Check upload storage is not in the web root
- [ ] Verify filenames are sanitized

### 7. Logging
- [ ] Verify no sensitive data is logged (passwords, tokens)
- [ ] Check error messages don't expose stack traces in production
- [ ] Verify logging level is appropriate for production

## Remediation

Address all critical findings before deploying. Warnings should be tracked for near-term fixes.
