# TGTG DZ Backend

NestJS API for the Too Good To Go-style marketplace.

## Local Setup

```bash
npm install
cp .env.example .env
npm run migration:run
npm run seed
npm run start:dev
```

The API defaults to port `3002` in local development.

Useful endpoints:

- `GET /health` - deployment health check
- `GET /openapi.json` - lightweight API overview
- `POST /auth/register-client`
- `POST /auth/register-seller`
- `POST /auth/login`
- `GET /listings`
- `POST /orders/reserve`
- `POST /payments/satim/callback`

## Database

The app uses PostgreSQL and TypeORM migrations.

```bash
npm run migration:run
npm run migration:show
npm run migration:revert
```

Do not enable `synchronize` in production.

## Payments

Local development uses `PAYMENTS_PROVIDER=mock`.

Production should use `PAYMENTS_PROVIDER=satim` only after the client provides the official SATIM/bank credentials and signing documentation. The current SATIM callback endpoint already records idempotent webhook events, but the signature logic must be adjusted to match the provider's official docs before launch.

## Admin / Audit

Admin-only routes live under `/admin`.

Current admin capabilities:

- list users
- list sellers
- verify/unverify sellers
- list/moderate listings
- inspect orders/payments
- read audit logs

Security-sensitive admin actions are recorded in the `audit_log` table.

## Verification

```bash
npm run build
npm test -- --runInBand
npm run verify
```

The frontend should also pass:

```bash
cd ../app
npm run lint
npx tsc --noEmit
```

## Production Notes

- Use a managed secrets system, not committed `.env` files.
- Set `COOKIE_SECURE=true`.
- Set explicit `CORS_ORIGINS`.
- Use separate dev/staging/prod databases and payment credentials.
- Run migrations before starting the production server.
- Confirm `GET /health` is monitored by the hosting platform.
- Keep `PAYMENTS_PROVIDER=mock` until SATIM credentials and docs are received.
