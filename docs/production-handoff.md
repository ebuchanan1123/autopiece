# Production Handoff

## Step-by-step deployment

### 1. Provision infrastructure

1. Create a PostgreSQL 15+ database. Enable SSL and take note of the connection string.
2. Provision a Node 20+ server or container host (e.g. Railway, Render, Fly.io, or a VPS).
3. Provision a LibreTranslate instance if translation is needed, or configure the current translation provider.
4. Register an Expo push notification token endpoint (handled by `exp.host` automatically).
5. Obtain SATIM live credentials: `SATIM_MERCHANT_ID`, `SATIM_TERMINAL_ID`, `SATIM_API_KEY`, `SATIM_CALLBACK_SECRET`, `SATIM_RETURN_URL`, and `SATIM_CALLBACK_URL`.

### 2. Configure environment variables

Copy `backend/.env.example` to your hosting environment's secret store and fill in all values.

Required for production:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://...
JWT_SECRET=<random 64+ char value>
SESSION_FINGERPRINT_SECRET=<different random 64+ char value>
COOKIE_SECURE=true
CORS_ORIGINS=https://your-app-domain.com,https://your-web-domain.com
PAYMENTS_PROVIDER=satim
SATIM_MODE=production
SATIM_MERCHANT_ID=...
SATIM_TERMINAL_ID=...
SATIM_API_KEY=...
SATIM_CALLBACK_SECRET=...
SATIM_RETURN_URL=https://your-api.com/payments/satim/return
SATIM_CALLBACK_URL=https://your-api.com/payments/satim/callback
```

Do **not** set `PAYMENTS_PROVIDER=mock` in production — startup validation will reject it.
Production also rejects localhost/wildcard CORS origins and insecure cookies.

### 3. Build the backend

```bash
cd backend
npm ci
npm run build
```

### 4. Run database migrations

```bash
npm run migration:run:prod
```

This runs all pending migrations in `src/migrations/` in timestamp order against `DATABASE_URL`. Verify the output lists each migration as "executed" before continuing.

### 5. Create the first admin account

Use the dedicated admin creation script after migrations have run:

```bash
ADMIN_EMAIL=admin@yourdomain.com \
ADMIN_USERNAME="Owner Admin" \
ADMIN_PASSWORD="Use-A-Long-Random-Password-123" \
npm run admin:create
```

This creates the admin if it does not exist, or updates the existing account with
role `admin` and the new password. Store the password in the client's password
manager.

Do not run `npm run seed` in production. The seed script is for local demo data.

### 6. Start the server

```bash
npm run start:prod
```

The API will listen on `PORT` (default 3000). Point your reverse proxy or load balancer to it with HTTPS termination.

### 7. Verify the deployment

```bash
# Health check
curl https://your-api.com/health

# Admin login (should return access token)
curl -X POST https://your-api.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"YOUR_SECURE_PASSWORD"}'

# Admin endpoint (replace TOKEN with the access token from above)
curl https://your-api.com/admin/users \
  -H "Authorization: Bearer TOKEN"
```

### 8. Configure the mobile app

Set the environment variable in your Expo build or EAS secrets:

```
EXPO_PUBLIC_API_URL=https://your-api.com
```

Run a production build:

```bash
cd app
npx eas build --profile production --platform all
```

### 9. Final QA checklist

- [ ] Health endpoint returns 200
- [ ] Client registration and login work on real device
- [ ] Seller registration creates unverified seller
- [ ] Admin can log in and see the admin console
- [ ] Admin can approve/unapprove sellers
- [ ] Admin can search/filter users, sellers, listings, and orders
- [ ] Admin order detail shows support context without exposing payment raw payloads
- [ ] Listing creation and browsing work end-to-end
- [ ] Payment flow reaches SATIM without error
- [ ] Duplicate payment callback does not double-confirm an order
- [ ] Push notifications deliver on iOS and Android
- [ ] CORS rejects origins not in `CORS_ORIGINS`

---

## Migration runbook

### Run all pending migrations

```bash
cd backend
npm run migration:run:prod
```

Before running migrations:

1. Confirm the app version being deployed.
2. Confirm `DATABASE_URL` points at the intended production database.
3. Confirm a fresh backup exists.
4. Run `npm run migration:show:prod` and save the output in deployment notes.

### Check which migrations have run

```sql
SELECT * FROM migrations ORDER BY timestamp DESC;
```

### Roll back the last migration

```bash
npm run migration:revert:prod
```

This reverts one migration (calls its `down()` method). Run repeatedly to roll back multiple steps. Always verify data integrity after a revert.

### Create a new migration

```bash
npm run migration:generate:prod -- src/migrations/<MigrationName>
```

Review the generated file before running — TypeORM auto-generation is not always correct for complex schema changes.

### Emergency rollback procedure

1. Stop or drain the new server instance.
2. Restore the previous app version.
3. If the migration is reversible and no customer data would be lost, run `npm run migration:revert:prod` once per migration.
4. If data integrity is uncertain, restore the verified database backup instead of hand-editing rows.
5. Verify with health check, admin login, client login, and a test listing browse.
6. Document the failed migration and fix it before re-deploying.

---

## Payment readiness

- Keep `PAYMENTS_PROVIDER=mock` only in development or staging.
- Production startup validation rejects mock payments, localhost CORS origins, and missing SATIM credentials.
- **Replace the SATIM callback signature verification** with the provider's official HMAC algorithm before go-live (`src/orders/orders.service.ts` — search for `TODO: SATIM signature`).
- Test all payment states: success, failure, cancellation, duplicate callback, expired payment.
- Confirm refund and cancellation rules with the client.

---

## Operational runbook

| Task | Command |
|------|---------|
| Health check | `GET /health` |
| API overview | `GET /openapi.json` |
| Recent admin activity | `GET /admin/audit` (requires admin JWT) |
| View logs | `journalctl -u tgtg-api -f` or your host's log viewer |
| Restart service | Depends on host — e.g. `systemctl restart tgtg-api` or redeploy via CI |

### Useful DB queries

```sql
-- Pending seller approvals
SELECT sp.id, sp."storeName", u.email, sp."createdAt"
FROM seller_profile sp
JOIN "user" u ON u.id = sp."userId"
WHERE sp."isVerified" = false
ORDER BY sp."createdAt" ASC;

-- Recent orders with payment status
SELECT o."orderNumber", o.status, o."totalDzd", p.status AS payment_status, o."createdAt"
FROM "order" o
LEFT JOIN payment p ON p."orderId" = o.id
ORDER BY o."createdAt" DESC
LIMIT 50;

-- Locked accounts
SELECT id, email, "failedLoginCount", "lockUntil"
FROM "user"
WHERE "lockUntil" > NOW();

-- Admin audit log (last 24h)
SELECT al.action, al."entityType", al."entityId", u.email AS actor, al."createdAt"
FROM audit_log al
LEFT JOIN "user" u ON u.id = al."actorUserId"
WHERE al."createdAt" > NOW() - INTERVAL '24 hours'
ORDER BY al."createdAt" DESC;
```

---

## Known follow-ups

- Replace the SATIM callback signature stub with the official provider algorithm.
- Add production crash reporting for the mobile app (e.g. Sentry).
- Add CI/CD and dependency scanning (Dependabot or Snyk).
- Replace lightweight `/openapi.json` with generated Swagger docs if an external team will integrate with the API.
- Add GDPR-compliant user data export and deletion endpoints before operating in regulated markets.
- Keep `docs/security-review.md` updated as routes and payment behavior change.
