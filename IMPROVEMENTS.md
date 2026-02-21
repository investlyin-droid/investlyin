# Improvement guide

Ways to improve security, reliability, and maintainability of the trading platform.

---

## Auth & security

| Improvement | Priority | Notes |
|-------------|----------|--------|
| **JWT refresh tokens** | Medium | Issue short-lived access token (e.g. 15m) + refresh token; frontend refreshes before expiry. Reduces impact of token theft. |
| **Secure cookie in production** | Done | Auth cookie now uses `Secure` when served over HTTPS. |
| **Rate limit auth endpoints** | Done | Global `ThrottlerModule` applies to all routes. Optionally add stricter limits for `/auth/*` (e.g. 5/min per IP). |
| **Firebase token revocation** | Low | On sensitive actions, optionally re-verify with Firebase that the user is still valid. |
| **No tokens in logs** | Low | Ensure `firebaseToken` and `access_token` are never logged (search for `console.log` with response bodies). |
| **CORS in production** | High | Set `ALLOWED_ORIGINS` to your frontend domain(s); never use `true` in production. |

---

## Backend

| Improvement | Priority | Notes |
|-------------|----------|--------|
| **Auth DTOs** | Done | `FirebaseLoginDto` and `FirebaseRegisterDto` validate and type auth request bodies. |
| **Stricter throttle on /auth** | Medium | Use `@Throttle(5, 60)` (5 per minute) on auth controller to reduce brute force / token abuse. |
| **Health check** | Low | Add `/health` that checks MongoDB and optionally Redis; useful for load balancers. |
| **Request ID / correlation** | Low | Add middleware to set `X-Request-Id` for tracing errors and logs. |

---

## Frontend

| Improvement | Priority | Notes |
|-------------|----------|--------|
| **Auto token refresh** | Medium | Before JWT expires, call a refresh endpoint (if you add refresh tokens) or re-login with Firebase. |
| **Persist auth in httpOnly cookie** | Medium | Store JWT in httpOnly cookie (set by backend) instead of localStorage to reduce XSS risk; API reads cookie or backend sets it. |
| **Loading / error states** | Low | Consistent loading and error handling on login/register and protected pages. |
| **Session timeout UX** | Low | On 401, show “Session expired” and redirect to login with a clear message. |

---

## DevOps & production

| Improvement | Priority | Notes |
|-------------|----------|--------|
| **Env validation** | High | Use `@nestjs/config` with a schema (e.g. Joi) so the app fails fast if `JWT_SECRET`, `MONGO_URI`, or Firebase vars are missing. |
| **Structured logging** | Medium | Replace `console.log` with a logger (e.g. Pino, Nest Logger) and JSON format for production. |
| **Secrets** | High | Never commit `.env`; use env vars or a secret manager (e.g. AWS Secrets Manager) in production. |
| **Firebase authorized domains** | High | In Firebase Console, add your production domain under Authentication → Settings → Authorized domains. |

---

## Quick wins already in place

- Firebase + JWT: Firebase for identity, your JWT for API access.
- MongoDB user linked to Firebase via `firebaseUid`.
- Protected routes (middleware + `AuthGuard('jwt')`).
- Return URL (`?from=`) after login.
- Rate limiting (global Throttler).
- Auth request validation (DTOs).

Use this list to pick the next improvements that matter most for your environment (e.g. production launch vs. dev experience).
