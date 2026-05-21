# Auth Review Checklist

Deep review of authentication and authorization patterns.

## Checks

### 1. Authentication Mechanism
- [ ] Identify the auth strategy (JWT, session, OAuth, etc.)
- [ ] Verify password hashing uses a strong algorithm (bcrypt, argon2, scrypt)
- [ ] Check for plaintext password storage or comparison
- [ ] Verify password requirements (minimum length, complexity)

### 2. Session Management
- [ ] Check session token generation (cryptographic randomness)
- [ ] Verify session expiration and timeout settings
- [ ] Check for session fixation protection
- [ ] Verify session invalidation on logout
- [ ] Check for concurrent session limits if required

### 3. JWT-Specific (if applicable)
- [ ] Verify JWT signing algorithm (avoid `none`, use RS256 or ES256)
- [ ] Check token expiration (`exp` claim)
- [ ] Verify token is validated on every request
- [ ] Check for token revocation mechanism
- [ ] Verify JWT secret is not hardcoded

### 4. Authorization
- [ ] Verify role-based access control (RBAC) is implemented
- [ ] Check for privilege escalation vectors
- [ ] Verify API endpoints enforce authorization (not just authentication)
- [ ] Check for insecure direct object references (IDOR)
- [ ] Verify admin routes have proper guards

### 5. Password Reset
- [ ] Verify reset tokens are single-use
- [ ] Check reset token expiration (should be short, < 1 hour)
- [ ] Verify reset link is sent to registered email only
- [ ] Check for rate limiting on reset requests

### 6. Multi-Factor Auth (if applicable)
- [ ] Verify MFA implementation is not bypassable
- [ ] Check backup codes are properly generated and stored
- [ ] Verify MFA is enforced for sensitive operations

### 7. API Authentication
- [ ] Verify API keys are not the sole auth mechanism for sensitive operations
- [ ] Check for proper scope/permission validation on API calls
- [ ] Verify API key rotation mechanism exists

## Remediation

Auth issues are always critical. Fix before any other work.
