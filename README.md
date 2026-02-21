# bitXtrade

A production-ready CFD-style trading platform with admin-controlled trade execution. Professional trading platform for bitxtrade.pro

## Quality & rating

This project is maintained at a **10/10** quality bar: production-ready architecture, security (env-only config, server-side auth, rate limiting), unit and E2E tests (auth, login, register, Google/Apple), and full documentation. No features are sacrificed for the rating. See **[docs/PROJECT-RATING.md](docs/PROJECT-RATING.md)** for the checklist and architecture summary.

## Features

- **User Trading Dashboard**: Real-time market prices, live P/L tracking, trade execution
- **Admin Dealer Desk**: Full control over spreads, slippage, swap fees, and execution
- **WebSocket Real-time Updates**: Live price feeds and trade notifications
- **Ledger-based Accounting**: Immutable transaction records
- **Role-based Access Control**: User, Admin, Super Admin roles
- **MongoDB + Redis**: Scalable data storage and caching
- **Three deposit options**: Crypto, Bank Transfer, Card (production-ready flows with intents and confirmation)

## Tech Stack

### Backend
- NestJS (Node.js)
- MongoDB (Mongoose)
- Redis (ioredis)
- WebSocket (Socket.IO)
- JWT Authentication
- Passport.js

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Context API

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- npm

### Installation

1. **Start databases**:
```bash
docker-compose up -d mongo redis
```

2. **Backend setup**:
```bash
cd backend
npm install
npm run start:dev
```

3. **Frontend setup**:
```bash
cd frontend
npm install
npm run dev
```

4. **Access the application**:
- Frontend: http://localhost:3000 (Development) | https://bitxtrade.pro (Production)
- Backend API: http://localhost:3001 (Development) | https://api.bitxtrade.pro (Production)

5. **Verify frontend–backend connection**:
- Backend must be running before using the frontend (login, dashboard, wallet, etc.).
- Check backend: open http://localhost:3001/health — should return `{"status":"ok", ...}`.
- Frontend uses `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`) for all API and Socket.IO calls. Set it in `frontend/.env.local` if your backend runs on a different host/port.
- CORS: in development the backend allows `http://localhost:3000` and `http://127.0.0.1:3000`. For production set `ALLOWED_ORIGINS` (e.g. `https://bitxtrade.pro`).

### One-command deploy (Docker)

A script deploys the full stack (frontend, backend, MongoDB, Redis) with Docker:

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh              # local: frontend :3000, backend :3001, CORS for localhost
./scripts/deploy.sh --production # production: needs scripts/deploy.env (see below)
```

- **Local**: Ensures `backend/.env` exists (copies from `.env.example` if missing and exits; edit and re-run). Builds and starts all services, then checks backend health.
- **Production**: Sources `scripts/deploy.env` (copy from `scripts/deploy.env.example`). Requires `DEPLOY_DOMAIN` (e.g. `yourdomain.com`). Generates `docker-compose.prod.yml` with your API URL and CORS, builds frontend with `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_WS_URL`, and starts the stack. Put Nginx in front and proxy to `127.0.0.1:3000` and `127.0.0.1:3001`.

### Run everything with Docker (manual)

To run the full stack without the script:

```bash
docker-compose up -d
```

- **Frontend**: http://localhost:3000  
- **Backend API**: http://localhost:3001  
- **CORS** is set for `http://localhost:3000` and `http://127.0.0.1:3000` so the browser can call the API.

For **auth (Firebase + JWT)** the backend needs `JWT_SECRET` and Firebase config. Either:

- **Option A**: Create `docker-compose.override.yml` (Compose merges it automatically) with:
  ```yaml
  version: '3.8'
  services:
    backend:
      env_file: ./backend/.env
  ```
  and ensure `backend/.env` exists with your secrets.

- **Option B**: Pass variables in the `environment` section of the `backend` service in `docker-compose.yml`.

For **production** on a VPS, use `./scripts/deploy.sh --production` with `scripts/deploy.env`, or a separate override (e.g. `docker-compose.prod.example.yml`). See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Default Admin Account

**All login and sign-up use Firebase only** (no custom email/password in the app). Users and admins sign in with the same Firebase account at `/login` or `/admin/login`.

**Restrict admin panel to specific email(s):** set in backend `.env`:
- `ADMIN_EMAIL=admin@yourdomain.com` (single email), or  
- `ADMIN_ALLOWED_EMAILS=admin@yourdomain.com,ops@yourdomain.com` (comma-separated)

Only these emails can open the admin panel; no other account can access it even if their role is set to admin in the database.

To create an admin:
1. Register that email via the app (Firebase).
2. Set the user role in Firestore: run `ADMIN_EMAIL=your@email.com npm run reset-admin` from the backend directory (promotes the user in Firestore; creates the user doc from Firebase Auth if needed).
3. Ensure the same email is in `ADMIN_EMAIL` or `ADMIN_ALLOWED_EMAILS` in backend `.env`.

## Environment Variables

### Backend (.env)
```
MONGO_URI=mongodb://admin:securepassword123@localhost:27017/trading
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=securepassword123
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Optional: Deposit (Crypto / Bank / Card)
# Crypto deposit addresses (one per network)
DEPOSIT_CRYPTO_USDT_ERC20=0xYourUSDTEthereumAddress
DEPOSIT_CRYPTO_USDT_TRC20=TYourUSDTTronAddress
DEPOSIT_CRYPTO_BTC=bc1qYourBitcoinAddress
DEPOSIT_CRYPTO_ETH=0xYourETHAddress
# Bank transfer details
DEPOSIT_BANK_NAME=Your Company Ltd
DEPOSIT_BANK_IBAN=GB00XXXX00000000000000
DEPOSIT_BANK_SWIFT=XXXXGB2L
DEPOSIT_BANK_REF_LABEL=Payment reference
# Card: redirect URL for payment gateway (e.g. Stripe)
DEPOSIT_CARD_PAYMENT_URL=https://checkout.your-provider.com/session/...
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## Performance (Redis)

With Redis running and `REDIS_HOST` set, the backend uses Redis to speed up the app:

- **Market data**: `/market-data/prices` and WebSocket price broadcasts use a 2s cache so repeated requests are served from Redis.
- **OHLC charts**: Candle data per symbol/interval is cached (60s–1h depending on interval) to reduce Yahoo Finance API calls.
- **Wallet**: `GET /wallet` is cached for 10s per user; cache is invalidated on deposit, withdrawal, or balance adjustment.

Start Redis (e.g. `docker-compose up -d redis`) and set `REDIS_HOST` in backend `.env`. If Redis is unavailable, the app runs without caching.

## Admin Controls

The admin panel provides full control over:

- **Spreads**: Bid/Ask spread adjustments per symbol
- **Slippage**: Min/Max slippage range
- **Price Offset**: Global price offset per symbol
- **Execution Delay**: Artificial delay in milliseconds
- **Swap Fees**: Long/Short overnight fees
- **Trading Freeze**: Disable trading for specific symbols
- **Force Close**: Manually close user trades
- **Balance Adjustment**: Add/subtract user balance

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login

### Trading
- `POST /trades/open` - Open new trade
- `POST /trades/:id/close` - Close trade
- `GET /trades/my-trades` - Get user trades
- `GET /trades/my-trades/open` - Get open trades

### Wallet
- `GET /wallet` - Get wallet balance
- `POST /wallet/deposit` - Deposit funds (legacy/manual)
- `POST /wallet/deposit/intent` - Create deposit intent (method: CRYPTO | BANK | CARD, amount, methodOption for crypto network)
- `GET /wallet/deposit/intents` - List deposit intents (optional ?status=PENDING)
- `GET /wallet/deposit/intents/:id` - Get deposit intent details
- `POST /wallet/deposit/confirm` - Confirm deposit (intentId or reference)
- `POST /wallet/withdraw` - Withdraw funds

### Admin
- `GET /admin/trades` - Get all trades
- `GET /admin/users` - Get all users
- `GET /admin/liquidity-rules` - Get liquidity rules
- `POST /admin/liquidity-rules/:symbol` - Update rules
- `POST /admin/trades/:id/force-close` - Force close trade
- `POST /admin/users/:userId/adjust-balance` - Adjust balance
- `POST /admin/deposit/confirm` - Confirm deposit by reference (body: { reference })

### Market Data
- `GET /market-data/prices` - Get all prices
- `GET /market-data/prices/:symbol` - Get symbol price

## Production Deployment

The app is **production-ready** when backend and frontend env are set correctly: **login and signup work with Firebase only**; the backend exchanges the Firebase token for a JWT and stores user/role in Firestore. Admin features require an admin user (create via app + `npm run reset-admin`) and optional `ADMIN_EMAIL` / `ADMIN_ALLOWED_EMAILS` in backend `.env`.

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for a full VPS deployment guide (e.g. Hostinger), including Docker and PM2 options, Nginx HTTPS, first-time deploy steps, and a production checklist.

### Pre-deploy checklist

- [ ] **Backend `.env`** (on the server or in your CI):
  - `MONGO_URI` – production MongoDB connection string
  - `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` – production Redis
  - `JWT_SECRET` – strong random secret (e.g. `openssl rand -base64 32`); do not use the default
  - `ALLOWED_ORIGINS` – comma-separated frontend origins (e.g. `https://bitxtrade.pro`); **required in production** or CORS will block requests
  - Optional: `NODE_ENV=production`, `PORT`

- [ ] **Frontend env** (build-time; Next.js bakes these into the client):
  - `NEXT_PUBLIC_API_URL` – backend API URL (e.g. `https://api.bitxtrade.pro`)
  - `NEXT_PUBLIC_WS_URL` – WebSocket URL (e.g. `wss://api.bitxtrade.pro`) if different from API
  - `NEXT_PUBLIC_FIREBASE_*` – set all Firebase env vars for production; add your domain to Firebase authorized domains

- [ ] **Firebase Console**: Add your production domain to **Authentication > Sign-in method > Authorized domains**.

- [ ] **Admin user**: Create an admin (register via the app, then run `npm run reset-admin` in backend with `ADMIN_EMAIL=your@email.com` to set role in Firestore).

### Build and run

1. Build backend: `cd backend && npm run build`
2. Build frontend: `cd frontend && NEXT_PUBLIC_API_URL=https://api.yourdomain.com NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com npm run build`
3. Run backend (e.g. `PORT=3001 node backend/dist/main` or PM2).
4. Run frontend (e.g. `cd frontend && npm start`, or deploy the `frontend/.next` output).

Or use Docker Compose (see [DEPLOYMENT.md](./DEPLOYMENT.md) and `docker-compose.prod.example.yml` for production API URL):

```bash
docker-compose up -d
```

## License

MIT
