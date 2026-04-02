# Investlyin

Next.js frontend and NestJS backend. Copy `backend/.env.example` → `backend/.env` and `frontend/.env.example` → `frontend/.env.local`, then run databases with `docker compose up -d mongo redis`, `cd backend && npm install && npm run start:dev`, and `cd frontend && npm install && npm run dev`.

Production: `docker compose -f docker-compose.yml -f docker-compose.prod.yml` with `backend/.env` configured; optional root `.env` from `compose.env.example` for `NEXT_PUBLIC_*` URLs. Hostinger VPS + optional Hostinger API MCP: **[docs/HOSTINGER_MCP.md](docs/HOSTINGER_MCP.md)**; on-server bootstrap: `scripts/hostinger-deploy.sh`.
