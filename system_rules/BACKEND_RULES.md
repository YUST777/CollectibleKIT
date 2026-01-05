# ICPC HUE Backend System Rules

> **CRITICAL**: These rules MUST be followed by any AI working on this codebase to maintain backend stability.

---

## 📌 Rule 1: API Routing Architecture

### The Golden Rule
```
NEVER create duplicate API routes between Express and Next.js
```

### Current Architecture

| Route Pattern | Server | Port |
|---------------|--------|------|
| `/api/auth/*` (except OTP) | Express | 3001 |
| `/api/admin/*` | Express | 3001 |
| `/api/views` | Express | 3001 |
| `/api/applications` | Express | 3001 |
| `/api/submit-application` | Express | 3001 |
| `/api/profile/:id` | Express | 3001 |
| `/api/get-ip` | Express | 3001 |
| `/api/health` | Express | 3001 |
| `/api/news/*` | Express | 3001 |
| `/api/training-sheets/*` | Next.js | 3000 |
| `/api/submissions/*` | Next.js | 3000 |
| `/api/leaderboard/*` | Next.js | 3000 |
| `/api/sheets/*` | Next.js | 3000 |
| `/api/judge/*` | Next.js | 3000 |
| `/api/stats/*` | Next.js | 3000 |
| `/api/analyze-complexity` | Next.js | 3000 |
| `/api/user/*` | Next.js | 3000 |
| `/api/recap/*` | Next.js | 3000 |
| `/api/auth/send-verification-otp` | Next.js | 3000 |
| `/api/auth/verify-otp` | Next.js | 3000 |

### Nginx Routing (MEMORIZE THIS)

```nginx
# FIRST: Specific patterns go to Next.js
location ~ ^/api/(training-sheets|submissions|leaderboard|sheets|judge|stats|analyze-complexity|user|recap|auth/send-verification-otp|auth/verify-otp) {
    proxy_pass http://frontend;
}

# SECOND: Everything else goes to Express (CATCH-ALL)
location /api/ {
    proxy_pass http://backend;
}
```

### Rules for Adding New APIs

1. **If adding auth-related endpoint** → Add to Express `server/index.js`
2. **If adding user data/dashboard endpoint** → Add to Next.js `app/api/`
3. **If adding training/judge endpoint** → Add to Next.js `app/api/`
4. **If adding admin endpoint** → Add to Express `server/index.js`
5. **If adding a NEW pattern to Next.js** → MUST update Nginx config:
   - `/home/ubuntu/icpchue/nginx/default.conf` (HTTP block ~line 31)
   - `/home/ubuntu/icpchue/nginx/default.conf` (HTTPS block ~line 137)

### NEVER DO THIS

❌ Create `/api/auth/something` in Next.js without updating Nginx
❌ Create duplicate route in both frameworks
❌ Change Nginx routing without testing all affected endpoints
❌ Add Express routes for paths that match Next.js patterns

---

## 📌 Rule 2: Authentication System

### Token Format
- JWT tokens are used for user authentication
- Tokens are passed via `Authorization: Bearer <token>` header
- Express uses `authenticateToken` middleware
- Next.js uses custom auth check in route handlers

### Express Auth Middleware Location
```javascript
// server/index.js - authenticateToken middleware
// Verifies JWT and sets req.user
```

### Admin Authentication
- Admin routes use THREE-FACTOR auth:
  1. Secret token in URL query param
  2. Basic Auth (username:password,totp)
  3. TOTP code (6 digits)

### Session Handling
- User sessions stored in PostgreSQL
- Login logs tracked in `login_logs` table
- Never store plain passwords (bcrypt hashing)

---

## 📌 Rule 3: Database Access

### Connection
- PostgreSQL database
- Connection via `DATABASE_URL` environment variable
- Express: Uses `pg` Pool directly
- Next.js: Uses `/lib/db.ts` query helper

### Critical Tables (DO NOT MODIFY SCHEMA)

| Table | Purpose | Auto-modified by |
|-------|---------|------------------|
| `users` | User accounts | Auth endpoints |
| `applications` | Student applications | Apply form |
| `training_submissions` | Code submissions | Judge system |
| `login_logs` | Login tracking | Auth system |
| `website_analytics` | Page views | Views API |

### Database Rules

1. **NEVER** delete data without user consent
2. **ALWAYS** use parameterized queries (prevent SQL injection)
3. **NEVER** expose raw database errors to clients
4. **ALWAYS** check row existence before UPDATE/DELETE
5. **Transaction** required for multi-table operations

---

## 📌 Rule 4: Deployment & Docker

### Container Architecture

```
┌─────────────────────────────────────────────────┐
│                   Nginx :443                      │
│                 (SSL Termination)                 │
└─────────────────────────────────────────────────┘
          │                           │
          ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│ Frontend :3000  │         │ Backend :3001   │
│    (Next.js)    │         │   (Express)     │
└─────────────────┘         └─────────────────┘
          │                           │
          ▼                           ▼
┌─────────────────────────────────────────────────┐
│               PostgreSQL :5432                   │
└─────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────┐         ┌─────────────────┐
│   Redis :6379   │         │  Mailserver     │
└─────────────────┘         └─────────────────┘
```

### Rebuild Commands

```bash
# Rebuild frontend only
docker compose up -d --build frontend

# Rebuild backend only
docker compose up -d --build backend

# Restart nginx (after config change)
docker compose restart nginx

# Full rebuild (CAUTION)
docker compose down && docker compose up -d --build
```

### Pre-Deployment Checklist

- [ ] Test all endpoints after API changes
- [ ] Check Nginx logs for routing issues
- [ ] Verify database migrations if schema changed
- [ ] Check container health: `docker ps`

---

## 📌 Rule 5: Rate Limiting

### Express Rate Limits

| Limiter | Requests | Window | Applied To |
|---------|----------|--------|------------|
| `authLimiter` | 10 | 15 min | Auth endpoints |
| `apiLimiter` | 100 | 15 min | General API |
| `standardLimiter` | 200 | 15 min | Public endpoints |
| `adminLimiter` | 50 | 15 min | Admin endpoints |

### When Hitting 403/429

1. Check if rate limit is the cause
2. Adjust limiter if too aggressive
3. NEVER disable rate limiting in production

---

## 📌 Rule 6: Error Handling

### Express Error Response Format
```javascript
res.status(400).json({ error: 'User-friendly message' });
```

### Next.js Error Response Format
```javascript
return NextResponse.json({ error: 'Message' }, { status: 400 });
```

### Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | - |
| 400 | Bad Request | Validate input |
| 401 | Unauthorized | Check token |
| 403 | Forbidden | Check permissions/API key |
| 404 | Not Found | Check route exists |
| 405 | Method Not Allowed | Check HTTP method |
| 429 | Rate Limited | Wait or increase limit |
| 500 | Server Error | Check logs |

---

## 📌 Rule 7: Environment Variables

### Required Variables (server/.env)

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
TOTP_SECRET=...
ADMIN_SECRET_TOKEN=...
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
```

### Never Do

❌ Commit .env files to git
❌ Hardcode secrets in source code
❌ Log sensitive data
❌ Expose env vars to client-side code

---

## 📌 Rule 8: Testing After Changes

### Mandatory Tests After API Changes

```bash
# Health check
curl https://icpchue.xyz/api/health

# Auth flow
curl -X POST https://icpchue.xyz/api/auth/check-email -d '{"email":"test@test.com"}'

# Public data
curl https://icpchue.xyz/api/leaderboard
curl https://icpchue.xyz/api/training-sheets

# OTP system
curl -X POST https://icpchue.xyz/api/auth/send-verification-otp -d '{"email":"test@test.com"}'
```

### If Any Test Fails

1. Check container logs: `docker logs icpchue-frontend` or `docker logs icpchue-backend`
2. Verify Nginx routing: `docker logs icpchue-nginx`
3. Check database connection: `docker exec icpchue-backend node -e "require('pg')..."`
4. Rollback if critical

---

## Summary Checklist

Before making ANY backend change:

- [ ] Identified correct server (Express vs Next.js)
- [ ] Checked Nginx routing pattern
- [ ] No duplicate routes created
- [ ] Authentication properly implemented
- [ ] Database queries are parameterized
- [ ] Error handling in place
- [ ] Rate limiting considered
- [ ] Tested endpoints after change
- [ ] Rebuilt correct container

---

**Last Updated:** January 4, 2026
**Maintainer:** AI System
