# Pre-Launch Audit – bitXtrade

Complete audit and test checklist before launch. Use this to verify every critical path and configuration.

---

## 1. Automated Test Results

### Backend (NestJS)

| Suite | Status | Notes |
|-------|--------|--------|
| Unit: `npm test` | ✅ Pass | app.controller, auth (controller + service), users (controller + service) |
| E2E: `npm run test:e2e` | ✅ Pass | GET `/`, GET `/health` (requires MongoDB; Jest may hang on exit due to open handles) |

**Run locally:**
```bash
cd backend && npm test && npm run test:e2e
```

### Frontend (Next.js + Playwright)

| Suite | Status | Notes |
|-------|--------|--------|
| E2E: `npm run test:e2e` (chromium) | 28 passed, 11 failed | Failures only in `admin.spec.ts` (admin login / "Platform Overview" and tab labels not found—likely UI copy or admin auth flow differs) |

**Run locally:**
```bash
# Terminal 1: start backend (and optionally Mongo + Redis)
cd backend && npm run start:dev

# Terminal 2: run Playwright (starts frontend automatically)
cd frontend && npm run test:e2e
```

**E2E coverage:** navigation & auth redirects, login/register forms, homepage, dashboard, wallet, responsive all pass. Admin tests expect specific labels (e.g. "Platform Overview", "Trade Management"); update `e2e/admin.spec.ts` to match actual admin UI text or skip when no admin user is available.

---

## 2. Security Audit

### 2.1 Authentication

- [ ] **Firebase** – Email/password and Google (and any other OAuth) work; redirect after login lands on dashboard (or `?from=`).
- [ ] **JWT** – Issued after Firebase verification; used for API and WebSocket auth.
- [ ] **Cookie** – `auth_token` set on login; `Secure` in production (HTTPS).
- [ ] **Protected routes** – `/dashboard`, `/wallet`, `/profile`, `/news`, `/market` require auth (middleware redirects to `/login?from=...`).
- [ ] **Admin** – `/admin` requires auth; role check on backend for admin-only endpoints.

### 2.2 Backend Security

- [ ] **Helmet** – Enabled (CSP, XSS, etc.); `crossOriginEmbedderPolicy: false` for WebSockets.
- [ ] **CORS** – `ALLOWED_ORIGINS` in production; dev: `localhost:3000` / `127.0.0.1:3000`.
- [ ] **Rate limiting** – ThrottlerModule (short/medium/long TTL and limits).
- [ ] **Validation** – Global `ValidationPipe`; DTOs for auth, wallet, trade, orders.
- [ ] **Secrets** – No JWT/Firebase/Mongo/Redis secrets in repo; `.env` in `.gitignore`.

### 2.3 Authorization

- [ ] **User endpoints** – Wallet, trades, orders, profile scoped by user (JWT `sub` or equivalent).
- [ ] **Admin endpoints** – Guarded by role (admin/super_admin); no user access to admin routes.

---

## 3. API Audit

### 3.1 Public (no auth)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | App info (message, status, version) |
| GET | `/health` | Health + DB status |
| POST | `/auth/firebase-login` | Firebase login → JWT |
| POST | `/auth/firebase-register` | Firebase register → JWT |
| GET | `/market-data/prices` | All prices (cached) |
| GET | `/market-data/prices/:symbol` | Single price |
| GET | `/market-data/ohlc/:symbol` | OHLC default interval |
| GET | `/market-data/ohlc/:symbol/:interval` | OHLC by interval |
| GET | `/market-data/test/all-symbols` | Test/categorised symbols |
| GET | `/news` | News list |
| GET | `/news/calendar` | Calendar events |

### 3.2 User (JWT required)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/wallet` | User wallet (cached) |
| GET | `/wallet/fees` | Fee config |
| GET | `/wallet/deposit/crypto-networks` | Crypto networks |
| GET | `/wallet/deposit/crypto-address/:network` | Deposit address |
| POST | `/wallet/deposit/intent` | Create deposit intent |
| GET | `/wallet/deposit/intents` | List intents |
| GET | `/wallet/deposit/intents/:id` | Intent detail |
| PATCH | `/wallet/deposit/intents/:id` | Update intent |
| POST | `/wallet/deposit/upload-screenshot` | Upload screenshot |
| POST | `/wallet/deposit/confirm` | Confirm deposit |
| POST | `/wallet/withdraw` | Withdraw |
| POST | `/trades/open` | Open trade |
| POST | `/trades/:id/close` | Close trade |
| GET | `/trades/my-trades` | User trades |
| GET | `/trades/my-trades/open` | Open trades |
| POST | `/orders` | Place order |
| GET | `/orders` | List orders |
| GET | `/orders/pending` | Pending orders |
| DELETE | `/orders/:id` | Cancel order |
| GET | `/ledger/my-transactions` | User transactions |
| GET | `/users/profile` | Profile |
| PUT | `/users/change-password` | Change password |
| POST | `/users/2fa/setup` | 2FA setup |
| POST | `/users/2fa/verify` | 2FA verify |
| POST | `/users/2fa/disable` | 2FA disable |
| POST | `/users/kyc/submit` | KYC submit |
| POST | `/users/api-keys/generate` | Generate API key |
| GET | `/users/api-keys` | List API keys |
| DELETE | `/users/api-keys/:id` | Delete API key |

### 3.3 Admin (admin/super_admin only)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/overview` | Dashboard stats |
| GET | `/admin/deposit-intents` | Deposit intents |
| GET | `/admin/audit-log` | Audit log |
| GET | `/admin/liquidity-rules` | Liquidity rules |
| GET | `/admin/liquidity-rules/:symbol` | Rule for symbol |
| POST | `/admin/liquidity-rules/:symbol` | Update rule |
| GET | `/admin/trades` | All trades |
| POST | `/admin/trades/:id/force-close` | Force close |
| POST | `/admin/trades/:id/override` | Override trade |
| POST | `/admin/trades/:id/activate` | Activate |
| POST | `/admin/trades/:id/deactivate` | Deactivate |
| POST | `/admin/trades/create-for-user` | Create trade for user |
| GET | `/admin/users` | All users |
| GET | `/admin/users/:userId/transactions` | User transactions |
| POST | `/admin/users/:userId/adjust-balance` | Adjust balance |
| PUT | `/admin/users/:userId/status` | User status |
| PUT | `/admin/users/:userId/kyc-status` | KYC status |
| PUT | `/admin/users/:userId/profile` | User profile |
| POST | `/admin/users/:userId/reset-password` | Reset password |
| POST | `/admin/users/:userId/disable-2fa` | Disable 2FA |
| POST | `/admin/users/:userId/reset-2fa` | Reset 2FA |
| DELETE | `/admin/users/:userId` | Delete user |
| DELETE | `/admin/trades/:id` | Delete trade |
| POST | `/admin/deposit/reject` | Reject deposit |
| POST | `/admin/deposit/confirm` | Confirm deposit |
| PUT | `/admin/symbols/:symbol/freeze` | Freeze symbol |
| GET | `/admin/payment-config` | Payment config |
| PUT | `/admin/payment-config` | Update payment config |
| GET | `/admin/orders` | All orders |
| GET | `/admin/users/:userId/orders` | User orders |
| DELETE | `/admin/orders/:id` | Delete order |

---

## 4. Critical Flows (Manual Test Checklist)

### 4.1 Auth

- [ ] Register (email/password) → redirect to dashboard or login.
- [ ] Login (email/password) → dashboard (or `?from=`).
- [ ] Google sign-in → consent → redirect to dashboard (no “stuck on login”).
- [ ] Logout → cookie cleared; redirect to login.
- [ ] Visit `/dashboard` without auth → redirect to `/login?from=%2Fdashboard`.
- [ ] Visit `/login` when authenticated → redirect to dashboard.

### 4.2 Trading

- [ ] Dashboard loads; symbol selector and chart load (OHLC from API).
- [ ] Live prices (WebSocket) update; “LIVE” indicator when connected.
- [ ] Open trade (BUY/SELL) with valid lot and price → position appears.
- [ ] Close trade → P/L and balance update; trade moves to history.
- [ ] Place pending order (limit/stop) → appears in Orders tab.
- [ ] Cancel pending order → removed.

### 4.3 Wallet

- [ ] Wallet page shows balance (and equity if applicable).
- [ ] Create deposit intent (e.g. CRYPTO) → intent created; address/instructions shown.
- [ ] Withdraw (if allowed) → balance decreases; validation for insufficient balance.

### 4.4 Market

- [ ] Market page lists symbols; categories/filters work.
- [ ] Search and sort work; click symbol → trade or detail as designed.

### 4.5 Admin

- [ ] Admin login (admin user) → admin dashboard.
- [ ] Overview: trades, users, deposit intents visible.
- [ ] Liquidity rules: update spread/slippage for symbol.
- [ ] Force close user trade.
- [ ] Adjust user balance.
- [ ] Confirm/reject deposit.
- [ ] Freeze symbol → user cannot open new trades for that symbol.

### 4.6 Frontend

- [ ] Homepage loads; nav to Login/Register/Dashboard (when auth).
- [ ] Responsive: dashboard and market usable on mobile (e.g. 375px).
- [ ] No console errors on critical paths (login, dashboard, open/close trade).
- [ ] API base URL correct (`NEXT_PUBLIC_API_URL`); WebSocket connects to same host.

---

## 5. Performance & Resilience

- [ ] **Redis** – When `REDIS_HOST` is set: prices and OHLC cached; wallet cached with invalidation on write.
- [ ] **Market data** – OHLC not fetched on every request (cache TTL per interval).
- [ ] **Rate limit** – No unexpected 429 under normal use; limits documented or adjusted for production.
- [ ] **WebSocket** – Reconnects after disconnect; no “closed before connection” spam in console (handled in hooks).
- [ ] **Chart** – No “Object is disposed” errors (guard after unmount).

---

## 6. Error Handling & UX

- [ ] **401** – Frontend redirects to login (except on auth endpoints); no infinite loop.
- [ ] **403** – User sees “forbidden” or redirect; admin routes not accessible to users.
- [ ] **4xx/5xx** – Toasts or inline messages; no uncaught promise rejections on critical flows.
- [ ] **Network failure** – Graceful message; retry or “try again” where appropriate.
- [ ] **Validation** – Invalid lot/price/symbol show clear messages.

---

## 7. Configuration & Deployment

### 7.1 Environment

- [ ] **Backend** – `MONGO_URI`, `REDIS_HOST` (optional), `JWT_SECRET`, `FIREBASE_*` set; production secrets strong and not default.
- [ ] **Frontend** – `NEXT_PUBLIC_API_URL` (and WS URL if different) point to backend.
- [ ] **CORS** – `ALLOWED_ORIGINS` set in production to actual frontend origin(s).
- [ ] **Firebase Console** – Authorized redirect URIs include production login URL (and dev if used).

### 7.2 Infrastructure

- [ ] MongoDB available and indexed (e.g. `userId`, `firebaseUid`, symbol, timestamps).
- [ ] Redis available if caching is desired (app runs without it).
- [ ] Upload dirs exist (`uploads/kyc-documents`, `uploads/payment-screenshots`) or are created on startup.
- [ ] HTTPS in production; cookie `Secure` and correct domain.

### 7.3 Build & Run

- [ ] `backend`: `npm run build` and `npm run start:prod` (or Docker).
- [ ] `frontend`: `npm run build` and `npm run start` (or Docker).
- [ ] Health check: `GET /health` returns 200 and DB status.

---

## 8. Summary Checklist

| Area | Items | Status |
|------|--------|--------|
| Backend unit tests | 5 suites | ✅ Pass |
| Backend e2e | 2 tests | ✅ Pass |
| Frontend e2e | 28 pass, 11 fail (admin) | ⬜ See Section 1 |
| Security (auth, CORS, rate limit, secrets) | Section 2 | ⬜ |
| API (public, user, admin) | Section 3 | ⬜ |
| Critical flows (auth, trade, wallet, admin) | Section 4 | ⬜ |
| Performance (Redis, WS, chart) | Section 5 | ⬜ |
| Error handling | Section 6 | ⬜ |
| Config & deployment | Section 7 | ⬜ |

Use this document as the single pre-launch checklist: run automated tests, then go through each section and tick items after verification.
