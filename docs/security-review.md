# Security Review Notes

Review date: 2026-05-03

## Public Routes

Expected public backend routes:

- `GET /`
- `GET /health`
- `GET /openapi.json`
- `POST /auth/register-client`
- `POST /auth/register-seller`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /listings`
- `GET /listings/:id`
- `GET /sellers/place-search`
- `POST /payments/satim/callback`
- `GET /payments/satim/return`

Protected route groups:

- `/admin/*` requires JWT admin role.
- `/orders/*` requires JWT.
- `/users/*` requires JWT, with `GET /users` limited to admin.
- seller profile update/read routes require JWT.
- listing create/update/delete and translation routes require JWT.
- favourites routes require JWT.

## Data Exposure Review

- User responses use `UsersService.toSafeUser()` and omit password hashes, failed
  login counters, and lock timestamps.
- Admin seller responses use safe seller profiles plus safe user data.
- Admin payment responses now omit `rawPayload`.
- Admin order detail includes customer, payment summary, and order items for
  support, but does not return raw payment provider payloads.
- Public listing routes only return active listings. They currently expose seller
  display information and listing detail fields used by the app experience.

## Logging Review

Request logging uses `nestjs-pino` redaction for:

- authorization and cookie headers
- payment callback signature headers
- password fields
- refresh/access/token fields
- card number/CVV/expiry fields
- payment raw payload/provider identifiers
- `Set-Cookie` response headers

Remaining recommendation: add a production error monitoring provider such as
Sentry and configure the same redaction rules there before go-live.

## Remaining Security Follow-Ups

- Replace the SATIM callback signature placeholder with the provider's official
  verification algorithm once documentation is received.
- Add 2FA or another strong admin-auth policy before launch if the client accepts
  the added operational complexity.
- Add dependency scanning in CI.
- Add backup restore tests to the deployment process.
- Add a privacy/legal review for user, order, location, notification, and payment
  metadata retention.
