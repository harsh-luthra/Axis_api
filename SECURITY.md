# Security Best Practices & Production Checklist

This document outlines critical security measures for the Axis API integration.

---

## 1. Environment & Secrets Management

### ✅ Do:
- **Use `.env` files locally only** — never commit `.env` to git (included in `.gitignore`)
- **Use `.env.example`** as a safe template that can be committed
- **Rotate credentials regularly** (API keys, DB passwords, p12 passphrases, AES keys)
- **Use a secret manager in production** (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault)
  - Load secrets at runtime, not from files
  - Audit secret access and rotate on suspected compromise
- **Generate strong random values** for sensitive defaults:
  ```bash
  # Generate a 64-char hex string (32 bytes)
  openssl rand -hex 32
  ```

### ❌ Don't:
- Hardcode secrets in code
- Log or print API keys, passwords, or tokens
- Commit `.env` or certificate files to git
- Use the same API key across multiple environments (dev/staging/prod)
- Store secrets in version control history (use `git-secrets` or similar)

---

## 2. API Authentication & Authorization

### Current Implementation:
- **API Key Authentication**: `X-API-Key` header required for most endpoints
- **Master Key**: `X-Master-Key` header for admin endpoints (e.g., `/admin/generate-api-key`)
- **Callback Bypass**: `/axis/callback` exempt from auth (webhook from Axis)

### ✅ Recommendations:
- **Hash and store API keys** in the database using bcrypt/HMAC:
  ```javascript
  // Instead of: SELECT * FROM merchants WHERE api_key = ?
  // Use: SELECT * FROM merchants WHERE api_key_hash = SHA256(api_key)
  ```
  - Only return the full key once during generation
  - Never log or display full keys in logs/UI

- **Implement key rotation**:
  - Support multiple active keys per merchant
  - Mark old keys as deprecated, then disable after grace period
  - Audit which key was used in each request

- **Webhook signature verification for `/axis/callback`**:
  - Axis should sign callbacks with HMAC-SHA256 (verify with shared secret)
  - Or use IP allowlist to restrict callback sources to Axis infrastructure IPs
  - Example:
    ```javascript
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(JSON.stringify(req.body));
    const expectedSignature = hmac.digest('hex');
    if (req.headers['x-signature'] !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    ```

- **Rate limit per API key**, not just per IP:
  ```javascript
  const keyBasedLimiter = rateLimit({
    keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
    max: 100, // 100 requests per window per key
    windowMs: 15 * 60 * 1000 // 15 minutes
  });
  ```

- **Implement role-based access control (RBAC)**:
  - Admin operations (`/admin/*`) require elevated privileges
  - Separate read-only vs. write permissions per merchant

---

## 3. Cryptography & TLS

### Current Implementation:
- **JWE + JWS** for request/response encryption with Axis
- **PKCS#12 mTLS** certificate for Axis API calls
- **AES-128-CBC** for callback decryption (Axis-specified)

### ✅ Recommendations:

#### JWE/JWS:
- ✓ RSA-OAEP-256 for key encryption (strong, OAEP padding)
- ✓ RS256 for signing (RSA signatures)
- ✓ A256GCM for symmetric encryption (authenticated GCM mode)
- **Verify**: Regularly audit key sizes and algorithms per Axis requirements

#### AES Callback Decryption:
- **Current**: AES-128-CBC with MD5 key derivation and fixed IV
- **Issue**: MD5 is cryptographically broken; CBC is older
- **Recommendation** (if you control both sides):
  - Migrate to AES-256-GCM with PBKDF2 key derivation
  - Otherwise, keep current implementation but:
    - Store AES key in env variable, never hardcode
    - Use authenticated encryption (GCM) if possible
    - Rotate AES keys annually

#### TLS for Axios Calls:
- ✓ mTLS enabled (PKCS#12 client cert)
- ✓ Certificate verification enabled (`rejectUnauthorized: true`)
- ✓ HTTP/2 support (negotiate automatically)
- **Verify**: Ensure p12 certificate is not expired; monitor expiry dates

#### Key Management:
- Store private keys with restricted file permissions (600):
  ```bash
  chmod 600 certs/keystore.p12
  chmod 600 certs/client_private.key
  ```
- Never log or print key material
- Rotate keys at least annually or on compromise suspicion

---

## 4. Input Validation & Injection Prevention

### Current Implementation:
- ✓ Joi schema validation on all public endpoints
- ✓ `stripUnknown: true` to reject extra fields (prevents field injection)
- ✓ SQL parameterized queries for all database operations

### ✅ Additional Recommendations:
- **Validate all inputs**, even from authenticated sources
- **Sanitize outputs** before returning to clients (no stack traces, internal errors)
- **Prevent ReDoS** (Regular Expression Denial of Service):
  - Test regex performance, especially date/amount patterns
  - Use simple, tested regex or libraries like `xss`
- **Prevent XXE** (XML External Entity): If parsing XML, disable external entities:
  ```javascript
  const xmlParser = new DOMParser({ errorHandler: null });
  xmlParser.normalizeDocument = false;
  ```

---

## 5. Error Handling & Logging

### Current Implementation:
- ✓ Error responses don't leak stack traces in production
- ✓ Sensitive request bodies not logged (validated payloads logged minimally)
- ✓ winston logger available for structured logging

### ✅ Recommendations:

#### Structured Logging:
- Use structured JSON logs (not free-form text):
  ```javascript
  logger.info('Fund transfer initiated', {
    merchantId: req.merchant.id,
    txnAmount: payload.txnAmount,
    beneCode: payload.beneCode,
    timestamp: new Date().toISOString(),
    requestId: req.id
  });
  ```
- **Never log**:
  - API keys or partial keys
  - Passwords or secrets
  - Full request/response payloads (log summaries instead)
  - PII (phone, email, account numbers — if you must, mask: `****1234`)

#### Centralized Logging & Monitoring:
- Send logs to a centralized system (e.g., ELK, Splunk, Datadog, AWS CloudWatch)
- Implement alerting for suspicious patterns:
  - Multiple failed auth attempts
  - Unusually large transaction amounts
  - Errors from Axis (potential outage)

#### Request IDs:
- Generate unique `requestId` per request (use `uuid`)
- Include in all logs and error responses for traceability
- Example:
  ```javascript
  app.use((req, res, next) => {
    req.id = uuidv4();
    res.set('X-Request-ID', req.id);
    next();
  });
  ```

---

## 6. Rate Limiting & DoS Protection

### Current Implementation:
- ✓ Global rate limit: 120 requests/minute per IP
- ✓ Trust proxy header for correct IP resolution

### ✅ Recommendations:
- **Per-endpoint rate limits** (stricter on sensitive endpoints):
  ```javascript
  const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10, // 10 requests per minute
    keyGenerator: (req) => req.headers['x-master-key'] || req.ip
  });
  
  app.post('/admin/revoke-key/:id', adminLimiter, ...);
  ```

- **Implement burst protection** (allow spikes but penalize sustained overuse)
- **IP-based blocking** after too many failures
- **Circuit breaker** to Axis API (stop retrying if service is down)
  - Example: retry 3 times with exponential backoff, then fail fast

---

## 7. Database Security

### Current Implementation:
- ✓ Parameterized queries (mysql2/promise)
- ✓ Connection pooling

### ✅ Recommendations:
- **Principle of Least Privilege**:
  - DB user should have minimal required permissions (SELECT, INSERT, UPDATE on specific tables)
  - No DROP, CREATE, or ALTER permissions
  - Example:
    ```sql
    GRANT SELECT, INSERT, UPDATE ON axis_payouts.* TO 'app_user'@'localhost';
    -- NOT: GRANT ALL PRIVILEGES
    ```

- **Encrypt sensitive data at rest**:
  - API keys in `merchants` table: hash them or use a separate keys table with hashed values
  - Transaction amounts: consider partial encryption or tokenization
  - AES keys: store in secure config management, not in DB

- **Audit trail**:
  - Log all admin operations (key generation, revocation)
  - Log failed auth attempts
  - Retain logs for at least 90 days (compliance requirement)

- **Backups**:
  - Encrypt backups at rest
  - Store in a separate, secure location (different cloud account/region)
  - Test restore procedures regularly

---

## 8. Deployment & Infrastructure

### ✅ Checklist:
- [ ] Run `npm audit` and fix vulnerabilities in CI/CD
- [ ] Use a Web Application Firewall (WAF) in front of the API
- [ ] Run on HTTPS only (enforce with HSTS headers, enabled by helmet)
- [ ] Set up DDoS protection (Cloudflare, AWS Shield, etc.)
- [ ] Use a reverse proxy (nginx, HAProxy) with:
  - Request size limits
  - Connection timeouts
  - HTTP method restrictions (only allow POST, GET, etc. as needed)
- [ ] Keep Node.js and all dependencies up-to-date
- [ ] Use a process manager (pm2, systemd) for crash recovery and log rotation
- [ ] Monitor CPU, memory, and disk usage
- [ ] Set up alerting for errors and anomalies

### Example nginx config snippet:
```nginx
server {
  listen 443 ssl http2;
  ssl_certificate /path/to/server.crt;
  ssl_certificate_key /path/to/server.key;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
  ssl_prefer_server_ciphers on;
  
  # Rate limit
  limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
  limit_req zone=api burst=20 nodelay;
  
  # Proxy to Node.js
  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_connect_timeout 10s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
  }
}
```

---

## 9. Compliance & Auditing

### ✅ Requirements (adjust per your jurisdiction):
- **PCI DSS** (if handling card data): encryption, access controls, monitoring
- **GDPR** (if serving EU users): data minimization, retention limits, breach notification
- **RBI / Local regulations**: comply with local banking authority requirements
- **SOX** (if public company): financial transaction logging and controls
- **ISO 27001** (information security standard): formal policies and procedures

### Audit Trail:
- Who accessed what, when, and from where
- All admin operations (key generation, revocation, merchant onboarding)
- Failed authentication attempts
- Large or unusual transactions
- Configuration changes

Example audit log:
```json
{
  "timestamp": "2026-02-11T14:50:00Z",
  "event": "api_key_generated",
  "merchant_id": 42,
  "generated_by": "admin@company.com",
  "ip": "203.0.113.5",
  "user_agent": "curl/7.68.0",
  "status": "success"
}
```

---

## 10. Incident Response

### Setup:
1. **On-call rotation**: Assign responders for security alerts
2. **Incident log**: All breaches, suspicious activity, deployment issues
3. **Forensics toolkit**: logs, packet captures, database snapshots
4. **Communication plan**: How to notify users, regulators, support team
5. **Recovery plan**: How to restore service, rotate credentials, patch systems

### Post-incident:
- Document what happened and why
- Identify root cause
- Implement preventive measures
- Communicate findings to stakeholder
- Update security policies/procedures

---

## 11. Quick Security Scan Checklist

Run regularly (daily in prod, weekly in staging):

```bash
# 1. Check for vulnerabilities
npm audit

# 2. Run linter
npx eslint src/ test/

# 3. Check for hardcoded secrets
npm install -g git-secrets
git secrets --scan

# 4. Check file permissions
ls -la certs/
# Should show: -rw------- (600) for .p12 and .key files

# 5. Verify .env is in .gitignore
grep '\.env' .gitignore

# 6. Verify HTTPS in production
curl -I https://api.example.com/test-balance

# 7. Check for exposed secrets in commits
git log --all --oneline -- '.env' | head -5
# Should return nothing (or only historical commits you know about)
```

---

## 12. References & Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Joi Validation](https://joi.dev/)
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Axis Bank API Security Specs](https://your-axis-docs.com)

---

## Questions or Issues?

- Contact security team for vulnerability reports
- File issues on your internal repo or ticketing system
- Refer to this document during code reviews

**Last updated:** 2026-02-11  
**Owner:** Security & Engineering Team
