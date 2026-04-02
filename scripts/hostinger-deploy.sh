#!/usr/bin/env bash
# Run ON THE VPS (Ubuntu 22.04/24.04) after cloning the repo and creating backend/.env
# Usage: sudo bash scripts/hostinger-deploy.sh [/path/to/repo]
set -euo pipefail

REPO_DIR="${1:-/opt/investlyin}"
cd "$REPO_DIR"

if [[ ! -f backend/.env ]]; then
  echo "ERROR: Create backend/.env from backend/.env.example (JWT, MONGO_URI, ALLOWED_ORIGINS, Firebase, etc.)"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker..."
  apt-get update -qq
  apt-get install -y ca-certificates curl
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: docker compose plugin missing. Install: apt-get install -y docker-compose-plugin"
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "WARN: No repo-root .env — using docker-compose.prod.yml defaults (api.investlyin.com)."
  echo "      Copy compose.env.example to .env and set NEXT_PUBLIC_* for your domain, then re-run."
fi

echo "Building and starting stack..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

echo "Waiting for backend..."
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:3001/health" >/dev/null 2>&1; then
    echo "OK: Backend health at http://127.0.0.1:3001/health"
    break
  fi
  sleep 2
done

curl -sf "http://127.0.0.1:3001/health" && echo "" || echo "WARN: Backend not ready yet — check: docker compose logs backend"

echo "Frontend (if mapped): http://127.0.0.1:3000"
echo "Next: Configure Nginx + SSL (see scripts/nginx-investlyin.conf.example)"
echo "Optional firewall: ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable"
echo "One-shot (fresh VPS): sudo SETUP_NGINX=1 bash scripts/hostinger-bootstrap.sh"
