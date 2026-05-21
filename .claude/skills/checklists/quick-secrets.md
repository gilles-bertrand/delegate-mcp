# Quick Secrets Checklist

Scan for accidentally committed secrets and credentials.

## Checks

### 1. API Keys and Tokens
- [ ] Search for patterns: `api_key`, `apikey`, `api-key`, `API_KEY`
- [ ] Search for patterns: `secret_key`, `SECRET_KEY`, `access_token`, `ACCESS_TOKEN`
- [ ] Search for patterns: `Bearer `, `Authorization:`
- [ ] Check `.env` files are in `.gitignore`
- [ ] Verify no `.env` files are tracked: `git ls-files '*.env*'`

### 2. Private Keys
- [ ] Search for `BEGIN PRIVATE KEY`, `BEGIN RSA PRIVATE KEY`
- [ ] Search for `BEGIN CERTIFICATE` (unless intentional)
- [ ] Check for `.pem`, `.key`, `.p12` files tracked in git

### 3. Database Credentials
- [ ] Search for hardcoded connection strings: `mongodb://`, `postgres://`, `mysql://`
- [ ] Check for inline passwords in config files
- [ ] Verify database URLs use environment variables

### 4. Third-Party Service Keys
- [ ] Search for Stripe keys: `sk_live`, `sk_test`
- [ ] Search for AWS keys: `AKIA` prefix
- [ ] Search for generic hex/base64 strings near "key" or "secret" labels

### 5. Git History
- [ ] Run: `git log --all --diff-filter=A -- '*.env*' '*.pem' '*.key'`
- [ ] Check if any secrets were committed and later removed (still in history)

## Remediation

If secrets are found:
1. Rotate the compromised credential immediately
2. Remove from git history using `git filter-branch` or BFG Repo Cleaner
3. Add the file pattern to `.gitignore`
