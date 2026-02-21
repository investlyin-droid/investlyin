# Deployment Checklist

Use this checklist before deploying the trading platform to production.

## Backend

### Environment (`.env` or platform env vars)

- [ ] **NODE_ENV** = `production`
- [ ] **PORT** – e.g. `3001` (or let platform set it)
- [ ] **ALLOWED_ORIGINS** – Comma-separated frontend URLs, e.g. `https://yourdomain.com,https://www.yourdomain.com`. **Required in production** or CORS will block all browser requests.
- [ ] **MONGO_URI** – Production MongoDB connection string (not localhost). **Required in production** – app will not start with default/localhost.
- [ ] **JWT_SECRET** – Strong random value (e.g. `openssl rand -base64 32`). **Required in production** – app will not start with default/example value.
- [ ] **Firebase** – One of: `FIREBASE_SERVICE_ACCOUNT_PATH`, `FIREBASE_SERVICE_ACCOUNT_JSON`, or `GOOGLE_APPLICATION_CREDENTIALS`
- [ ] **ADMIN_EMAIL** or **ADMIN_ALLOWED_EMAILS** – Comma-separated emails allowed to access `/admin`
- [ ] **REDIS_URL** or **REDIS_HOST** (recommended in production) – For session/cache; app may run with in-memory fallback but rate-limiting and consistency are better with Redis.
- [ ] **UPLOAD_DIR** (optional) – Writable path for KYC and payment screenshots; default `uploads`
- [ ] **PLATFORM_DEPOSIT_FEE_PERCENT**, **PLATFORM_WITHDRAWAL_FEE_PERCENT**, **PLATFORM_TRADE_FEE_PERCENT** (optional) – Fee %; default 0

### Production behaviour

- If **MONGO_URI** is missing or points to localhost in production, the backend **fails to start** (no default credentials).
- If **JWT_SECRET** is missing or still the example value in production, the backend **fails to start**.
- All other missing production env vars are **warned** at startup (e.g. ALLOWED_ORIGINS, Firebase, Redis).

### Health & CORS

- Health: **GET** `/health` – Returns DB, Redis, Firebase status.
- CORS: Only origins in **ALLOWED_ORIGINS** are allowed; credentials enabled.

### Routes (all under `/`)

| Prefix        | Auth   | Purpose                    |
|---------------|--------|----------------------------|
| `/`           | No     | Hello, version              |
| `/health`     | No     | Health check                |
| `/auth/*`     | No     | Firebase login/register     |
| `/users/*`    | JWT    | Profile, 2FA, KYC, API keys |
| `/wallet/*`   | JWT    | Balance, deposit, withdraw  |
| `/trades/*`   | JWT    | Open/close, my-trades       |
| `/orders/*`   | JWT    | Create, list, cancel        |
| `/ledger/*`   | JWT    | My transactions             |
| `/market-data/*` | No  | Prices, OHLC                |
| `/news/*`     | No     | News, calendar              |
| `/admin/*`    | JWT + role + allowlist | Admin panel APIs   |

## Frontend

### Environment (e.g. `.env.production` or platform env)

- [ ] **NEXT_PUBLIC_API_URL** – Backend URL, e.g. `https://api.yourdomain.com`
- [ ] **NEXT_PUBLIC_WS_URL** – WebSocket URL, e.g. `wss://api.yourdomain.com` (or same as API for Socket.IO)
- [ ] **NEXT_PUBLIC_FIREBASE_*** – All Firebase config from Firebase Console (API Key, Auth Domain, Project ID, etc.)

### Build

- [ ] Set **NEXT_PUBLIC_API_URL** and **NEXT_PUBLIC_WS_URL** at **build time** (e.g. in CI or `.env.production`). These are baked into the client bundle.
- [ ] `npm run build` (or `yarn build`) succeeds.
- [ ] No hardcoded `localhost` in production build (API/WS come from env). If you build without setting env, the client will show a console warning in production.

## Local development with Docker Desktop (MongoDB + Redis)

If you run **only MongoDB and Redis** in Docker (e.g. Docker Desktop) and run the backend on your machine:

1. **Start the databases** (from project root):
   ```bash
   docker-compose up -d mongo redis
   ```
   Or use your own MongoDB/Redis containers; ensure they expose `27017` and `6379` (and set Redis password if you use one).

2. **Backend `.env`** (in `backend/`): use **localhost** so the app (running on the host) can reach the containers:
   - `MONGO_URI=mongodb://admin:securepassword123@localhost:27017/trading?authSource=admin`
   - `REDIS_HOST=localhost`
   - `REDIS_PORT=6379`
   - `REDIS_PASSWORD=securepassword123` (must match Redis `--requirepass` if set)

3. **Do not set NODE_ENV=production** when running the backend locally. Leave it unset (or set `development`) so the app allows localhost MongoDB and the example JWT secret. Production checks only run when `NODE_ENV=production`.

4. Run the backend: `cd backend && npm run start:dev`, and the frontend: `cd frontend && npm run dev`.

**Full stack in Docker** (backend + frontend + mongo + redis): use `docker-compose up`. The backend container has `NODE_ENV=production` and uses hostnames `mongo` and `redis` (not localhost), so production checks pass.

## Integrations

- **Firebase** – Required for login/register and admin user resolution.
- **MongoDB** – Required; indexes are created by Mongoose schemas.
- **Redis** – Optional; used for wallet cache and rate limiting fallback. Use **REDIS_HOST** (and **REDIS_PORT**, **REDIS_PASSWORD** if needed).
- **News APIs** (MarketAux, NewsAPI, Alpha Vantage) – Optional; for news feed.

## Withdrawal flow

- User: **POST** `/wallet/withdraw` with `{ amount, walletAddress, chain }` → creates withdrawal request, balance deducted (fee applied from amount).
- Admin: **GET** `/admin/withdrawal-requests` to list; **POST** `/admin/withdrawal-requests/:id/approve` or `.../reject` (reject refunds the user).

## Security

- Helmet and compression are enabled.
- Global validation pipe (whitelist, transform). Sensitive admin routes (e.g. payment-config, withdrawal approve/reject, trade override) use strict DTOs with `forbidNonWhitelisted: true`.
- Global exception filter (no stack or internal messages in production).
- Rate limiting (Throttler) is enabled globally. Auth endpoints have stricter limits (e.g. login 20/min, register 10/min).
- Admin: JWT + role (admin/super_admin) + optional email allowlist (ADMIN_ALLOWED_EMAILS).

## Frontend production readiness

- **Error boundaries**: `app/error.tsx` (route-level) and `app/global-error.tsx` (root) catch unhandled render errors and show a recovery UI instead of a white screen.
- **API client**: Centralized timeout (30s), 401 handling (e.g. redirect/logout), and production warning if API URL is still localhost.
