#!/usr/bin/env bash
# First-time Hostinger VPS (Ubuntu): Docker, clone repo, optional Nginx + Certbot.
# Run: curl -fsSL ... | sudo bash   OR   sudo bash scripts/hostinger-bootstrap.sh
set -euo pipefail

GIT_REPO="${GIT_REPO:-https://github.com/investlyin-droid/investlyin.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/investlyin}"
SETUP_NGINX="${SETUP_NGINX:-0}"

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y ca-certificates curl git

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi

apt-get install -y docker-compose-plugin

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: docker compose plugin missing."
  exit 1
fi

mkdir -p "$(dirname "$INSTALL_DIR")"
if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  git clone "$GIT_REPO" "$INSTALL_DIR"
else
  git -C "$INSTALL_DIR" pull --ff-only
fi

cd "$INSTALL_DIR"

if [[ ! -f .env ]]; then
  cp compose.env.example .env
  echo "Created .env from compose.env.example — set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL to your API host (https + wss)."
fi

if [[ ! -f backend/.env ]]; then
  echo ""
  echo "=== REQUIRED: create backend/.env ==="
  echo "  cp $INSTALL_DIR/backend/.env.example $INSTALL_DIR/backend/.env"
  echo "Then edit backend/.env for Docker on this VPS:"
  echo "  - MONGO_URI=mongodb://admin:SAME_AS_MONGO_INITDB@mongo:27017/trading?authSource=admin"
  echo "  - REDIS_HOST=redis"
  echo "  - REDIS_PASSWORD= (same as MONGO_INITDB password in docker-compose.yml or change both)"
  echo "  - ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com"
  echo "  - JWT_SECRET, Firebase (FIREBASE_SERVICE_ACCOUNT_JSON or PATH), ADMIN_EMAIL, etc."
  echo ""
  echo "After backend/.env exists, run:"
  echo "  sudo bash $INSTALL_DIR/scripts/hostinger-deploy.sh $INSTALL_DIR"
  exit 0
fi

bash "$INSTALL_DIR/scripts/hostinger-deploy.sh" "$INSTALL_DIR"

if [[ "$SETUP_NGINX" == "1" ]]; then
  apt-get install -y nginx
  cp "$INSTALL_DIR/scripts/nginx-investlyin.conf.example" /etc/nginx/sites-available/investlyin
  ln -sf /etc/nginx/sites-available/investlyin /etc/nginx/sites-enabled/investlyin
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  apt-get install -y certbot python3-certbot-nginx
  echo "Run SSL (set your domains): certbot --nginx -d investlyin.com -d www.investlyin.com -d api.investlyin.com"
fi
