# Hostinger MCP and VPS deploy (Investlyin)

## Why the assistant cannot “deploy via MCP” from this repo

In Cursor, only MCP servers **enabled in your project** can be called. This workspace’s MCP folder currently includes **cursor-ide-browser** only — there is **no Hostinger MCP** connected, so automated deploy through Hostinger’s API is not available until you add it.

## Enable Hostinger API MCP (optional)

Hostinger provides **`hostinger-api-mcp`** to manage hosting/DNS/VPS via their API from compatible clients.

1. Create an **API token** in Hostinger (hPanel → **API** / see [Hostinger API MCP](https://www.hostinger.com/support/11079316-hostinger-api-mcp-server)).
2. Install (Node 24+ recommended per upstream docs):

   ```bash
   npm install -g hostinger-api-mcp
   ```

3. In **Cursor Settings → MCP**, add a server, for example:

   ```json
   {
     "mcpServers": {
       "hostinger-api": {
         "command": "hostinger-api-mcp",
         "env": {
           "API_TOKEN": "YOUR_HOSTINGER_API_TOKEN"
         }
       }
     }
   }
   ```

4. Restart Cursor. The Hostinger MCP can help with **DNS, VPS, and hPanel API actions** — it does **not** replace copying your app onto the server; you still **clone/build** the app on the VPS (Docker) or use your own CI.

## Deploy the app on your Hostinger VPS (Docker)

1. **DNS**: Point `@`, `www`, and `api` **A records** to your VPS IPv4.
2. **SSH**: `ssh root@YOUR_VPS_IP`
3. **Firewall**: `ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable`
4. **Clone** the repo (e.g. `/opt/investlyin`).
5. **`backend/.env`**: Copy from `backend/.env.example` — production `MONGO_URI`, `JWT_SECRET`, `ALLOWED_ORIGINS`, Firebase, Redis, `ADMIN_EMAIL`, etc. Use **strong** Mongo/Redis passwords; change defaults in `docker-compose.yml` if you expose services.
6. **Repo root `.env`**: Copy `compose.env.example` → `.env` and set:

   ```env
   NEXT_PUBLIC_API_URL=https://api.investlyin.com
   NEXT_PUBLIC_WS_URL=wss://api.investlyin.com
   ```

7. **Run** (on the server):

   ```bash
   chmod +x scripts/hostinger-deploy.sh
   sudo bash scripts/hostinger-deploy.sh /opt/investlyin
   ```

8. **Nginx + TLS**: Use `scripts/nginx-investlyin.conf.example`, then:

   ```bash
   certbot --nginx -d investlyin.com -d www.investlyin.com -d api.investlyin.com
   ```

9. **Firebase**: Add `investlyin.com` and `www.investlyin.com` to **Authorized domains**.

## Security note

Default `docker-compose.yml` maps **MongoDB** and **Redis** ports on the host. For production, **do not** expose `27017` / `6379` publicly; keep them on the Docker network only or bind to `127.0.0.1`, and use UFW so those ports are not open to the world.
