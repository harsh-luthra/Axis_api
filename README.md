# Axis API Integration - Production-Ready Setup

A secure, production-ready Node.js integration with Axis Bank for fund transfers, beneficiary management, and balance inquiries. Features comprehensive security hardening, input validation, rate limiting, and audit logging.

---

## 📋 Quick Start

### 1. Prerequisites
- Node.js 18+ 
- npm 8+
- MySQL 5.7+ (or MariaDB)
- Axis Bank API credentials (Client ID, Client Secret)
- PKCS#12 certificate from Axis (mTLS)

### 2. Clone & Install
```bash
git clone <your-repo-url> axis-api
cd axis-api
npm install
```

### 3. Configure Environment
```bash
# Copy example config
cp .env.example .env

# Edit .env with your values
nano .env
```

**Critical values to set:**
- `AXIS_ENV=UAT` or `PROD`
- `AXIS_CLIENT_ID` and `AXIS_CLIENT_SECRET`
- `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`
- `CLIENT_P12_PATH` and `CLIENT_P12_PASSWORD`
- `MASTER_API_KEY` (generate: `openssl rand -hex 32`)

### 4. Database Setup
```bash
# Create database
mysql -u root -p -e "CREATE DATABASE axis_payouts CHARACTER SET utf8mb4;"

# Run migrations (create tables)
mysql -u root -p axis_payouts < database/schema.sql
```

### 5. Start Server
```bash
# Development
npm run start:dev

# Production
npm start
```

Server runs on `http://localhost:3000` (or `$PORT`)

---

## 🔒 Security Features

### ✅ Implemented
- **Environment-based secrets** (`.env` with `.env.example` template)
- **API Key authentication** with merchant validation
- **Input validation** using Joi schemas on all endpoints
- **Rate limiting** (120 req/min globally, per-key limits on admin endpoints)
- **Security headers** via Helmet (CSP, X-Frame-Options, HSTS, etc.)
- **HTTPS/mTLS** for Axis API calls
- **Parameterized SQL queries** (no SQL injection risks)
- **Error handling** without exposing internal details
- **Structured logging** (minimal secrets in logs)
- **Request IDs** for traceability
- **Graceful shutdown** for clean restarts

### 🔧 Recommended Next Steps (see [SECURITY.md](SECURITY.md))
1. **Hash API keys** in database (bcrypt/HMAC)
2. **Webhook signature verification** for `/axis/callback`
3. **Per-merchant rate limits** (stricter on sensitive endpoints)
4. **Integration with secret manager** (AWS Secrets Manager, Vault)
5. **Centralized logging** (ELK, Datadog, AWS CloudWatch)
6. **Alert system** for anomalies (failed auth, large txns, service errors)

---

## 📖 API Endpoints

### Merchant Management
```bash
# Generate API key for new merchant (requires MASTER_API_KEY)
curl -X POST http://localhost:3000/admin/generate-api-key \
  -H "X-Master-Key: $MASTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_name": "Acme Corp",
    "corp_code": "ACME_001",
    "vendor_code": "VEN_001",
    "corporate_account": "123456789"
  }'
```

Response:
```json
{
  "success": true,
  "merchant_id": 1,
  "api_key": "a1b2c3d4e5f6...",
  "merchant_name": "Acme Corp"
}
```

### Fund Transfer
```bash
curl -X POST http://localhost:3000/fund-transfer \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "txnPaymode": "RT",
    "custUniqRef": "TXN_001_20260211",
    "txnType": "CUST",
    "txnAmount": "5000.00",
    "beneCode": "B_12345",
    "beneName": "John Doe",
    "valueDate": "2026-02-15",
    "beneAccNum": "1234567890",
    "beneIfscCode": "AXIS0001234"
  }'
```

### Check Transfer Status
```bash
curl -X POST http://localhost:3000/fund-transfer/status \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "crn": "TXN_001_20260211" }'
```

### Get Balance
```bash
curl -X GET http://localhost:3000/balance/1 \
  -H "X-API-Key: $API_KEY"
```

---

## 🧪 Testing & Quality

### Run Tests
```bash
npm test
```

Runs validation tests, security configuration checks, and middleware verification.

### Lint Code
```bash
npm run lint          # Fix issues automatically
npm run lint:check    # Check only (no fixes)
```

### Security Audit
```bash
npm run security:audit    # Check for vulnerable dependencies
npm run security:check    # Lint + audit
```

---

## 🚀 Deployment

### Development
```bash
npm run start:dev
```

### Production
```bash
# Ensure all env vars are set
export NODE_ENV=production
export PORT=8080
export AXIS_ENV=PROD
# ... set other required env vars from .env

# Start
npm start
```

### Docker (Optional)
```bash
docker build -t axis-api .
docker run -p 3000:3000 --env-file .env axis-api
```

### Process Manager (pm2)
```bash
npm install -g pm2
pm2 start src/server.js --name axis-api --instances max
pm2 save
pm2 startup
```

---

## 📊 Monitoring & Logging

### Application Logs
- `morgan` logs all HTTP requests (method, path, status, response time)
- `winston` available for structured logging
- All logs include request ID for traceability

### Recommended Integrations
- **Centralized Logs**: Datadog, ELK, AWS CloudWatch, Splunk
- **Error Tracking**: Sentry, Rollbar, Bug Snag
- **Metrics**: Prometheus, StatsD, CloudWatch
- **Alerting**: PagerDuty, Opsgenie, Slack

### Health Check
```bash
curl http://localhost:3000/test-balance
```

---

## 🔐 Certificate Management

### Axis PKCS#12 Certificate
Store at: `certs/keystore.p12` (or set `CLIENT_P12_PATH` in `.env`)

Protect file:
```bash
chmod 600 certs/keystore.p12
```

Verify certificate:
```bash
openssl pkcs12 -in certs/keystore.p12 -passin pass:$PASSWORD -noout
```

### Axis Public Certificate
Store at: `certs/rgw.jwejws.uat.axisb.com-sscert.txt` (or set `AXIS_PUBLIC_CERT_PATH`)

Verify:
```bash
openssl x509 -in certs/rgw.jwejws.uat.axisb.com-sscert.txt -text -noout
```

---

## 📝 Configuration Reference

See [.env.example](.env.example) for all available variables.

**Key variables:**
```bash
# Server
PORT=3000
NODE_ENV=development
TRUST_PROXY=1                    # Behind proxy? (1 = one proxy, false = none)

# Axis API
AXIS_ENV=UAT
AXIS_CLIENT_ID=...
AXIS_CLIENT_SECRET=...           # KEEP SECRET!
AXIS_CHANNEL_ID=...
AXIS_CORP_CODE=...
AXIS_CORP_ACC=...
AXIS_CALLBACK_KEY_HEX=...        # KEEP SECRET!

# Certificates
CLIENT_P12_PATH=./certs/keystore.p12
CLIENT_P12_PASSWORD=...          # KEEP SECRET!
AXIS_PUBLIC_CERT_PATH=./certs/rgw.jwejws.uat.axisb.com-sscert.txt

# Database
DB_HOST=localhost
DB_USER=root
DB_PASS=...                      # KEEP SECRET!
DB_NAME=axis_payouts

# Security
MASTER_API_KEY=...               # KEEP SECRET! (use openssl rand -hex 32)
```

---

## 🆘 Troubleshooting

### "X-Forwarded-For header set but trust proxy is false"
- Set `TRUST_PROXY=1` (or appropriate value) in `.env`
- Restart server

### "Private key not found in client-axis.p12"
- Verify p12 file path in `CLIENT_P12_PATH`
- Verify p12 password in `CLIENT_P12_PASSWORD`
- Check file permissions: `ls -la certs/keystore.p12`

### "MySQL connection failed"
- Verify `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` in `.env`
- Verify database exists: `mysql -u root -p -e "SHOW DATABASES;"`
- Check MySQL is running: `systemctl status mysql` (Linux) or `brew services list` (macOS)

### "Axis API returns 401"
- Verify `AXIS_CLIENT_ID` and `AXIS_CLIENT_SECRET`
- Verify certificate is valid and not expired
- Check logs for encryption/decryption errors

### "Rate limited (429)"
- Check `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers
- Wait until reset time or reduce request rate
- For per-key limits, use different API keys

---

## 📚 Additional Resources

- [SECURITY.md](SECURITY.md) — Comprehensive security best practices
- [Axis Bank API Docs](https://your-axis-api-docs.com)
- [Express Security Guide](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js](https://helmetjs.github.io/)
- [Joi Validation](https://joi.dev/)

---

## 📞 Support

- **Bugs**: File issues on GitHub or internal repo
- **Security**: Report to security@company.com
- **General Questions**: Contact engineering@company.com

---

## 📄 License

Proprietary — Axis API Integration  
(c) 2026 Your Company. All rights reserved.
