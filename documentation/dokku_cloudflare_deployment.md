# Dokku + Cloudflare Tunnel Deployment Guide (Apple Silicon VM)

Deploy the Vaani Banking Voice Assistant from an Ubuntu ARM64 VM that runs locally on an Apple Silicon Mac, while exposing it to the public internet through Cloudflare Tunnel. The steps below reflect the repo’s current configuration (gunicorn Procfile, Dokku storage mount, env-aware SQLite paths) and assume you manage Python packages in `.venv` using `uv`.

> **At-a-glance architecture**
>
> 1. **Ubuntu ARM64 VM (UTM / Parallels / VMware Fusion)** – hosts Docker, Dokku, Ollama, `cloudflared`.
> 2. **Dokku apps** – `backend` (FastAPI) and `frontend` (Vite React) deployed via git subtree.
> 3. **Persistent storage** – Dokku volume mounted at `/app/data` for SQLite durability.
> 4. **Cloudflare Tunnel + DNS** – `sunnationalbank.online` and `api.sunnationalbank.online` route through the tunnel (no router port-forwarding).

---

## Phase 0 – Prep the repo on macOS

```bash
cd ~/Documents/projects/vaani-deploment-trails/vaani-banking-voice-assistant
python -m venv .venv
. .venv/bin/activate
uv pip install --upgrade pip
uv pip install -r backend/requirements.txt
uv pip install -r requirements.txt   # optional: extra tooling
```

Stay inside `. .venv/bin/activate` whenever you run helper scripts or local tests. Your Mac should also have:

- Apple Silicon hardware with enough headroom to dedicate **≥8 CPU cores and 12–16 GB RAM** to the VM.
- SSH keys configured for GitHub and for the VM (we’ll copy the same public key into Dokku).
- Registrar access so you can switch the domain to Cloudflare nameservers.

---

## Phase 1 – VM + networking checklist

1. Create/launch the Ubuntu 22.04 ARM64 VM (UTM/Parallels/VMware). Allocate bridged networking so the VM earns its own LAN IP (critical for Dokku and Cloudflare Tunnel health checks).
2. Assign at least 100 GB storage plus 8 CPU cores & 12–16 GB RAM (Ollama and gunicorn appreciate the headroom).
3. Update the VM and install base packages:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y git curl build-essential pkg-config
   ```
4. Record the VM IP (via `ip addr show`) and ensure SSH access from macOS works.

---

## Phase 2 – Cloudflare Tunnel (“magic link”)

1. Add `sunnationalbank.online` to Cloudflare and switch the registrar nameservers to the pair Cloudflare provides.
2. Install the ARM64 `cloudflared` build on the VM:
   ```bash
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
   sudo dpkg -i cloudflared.deb
   ```
3. Authenticate and create a tunnel:
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create hackathon-tunnel
   ```
   Capture the tunnel UUID (the installer drops credentials under `/root/.cloudflared/`).
4. Defer DNS routing until the apps are live—we just need the tunnel ready.

---

## Phase 3 – Install server services on Ubuntu

1. **Docker (Dokku requirement):**
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   ```
2. **Dokku 0.34.6:**
   ```bash
   wget -NP . https://dokku.com/install/v0.34.6/bootstrap.sh
   sudo DOKKU_TAG=v0.34.6 bash bootstrap.sh
   ```
   Finish the one-time browser setup, then disable the default vhost.
3. **Add your macOS SSH key** so git pushes work from the host:
   ```bash
   # macOS
   cat ~/.ssh/id_rsa.pub
   # Ubuntu VM
   echo "ssh-rsa AAAAB3..." | sudo dokku ssh-keys:add admin
   ```
4. **Install Ollama system-wide (outside Dokku):**
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull llama3
   sudo systemctl edit ollama.service   # add Environment="OLLAMA_HOST=0.0.0.0"
   sudo systemctl daemon-reload
   sudo systemctl restart ollama
   ```
   Confirm `curl http://127.0.0.1:11434/api/version` responds before moving on.

---

## Phase 4 – Backend App (FastAPI + SQLite)

Changes already baked into the repo:

- `backend/Procfile` runs `gunicorn app:app`.
- `backend/requirements.txt` mirrors the lightweight dependencies and includes `gunicorn`.
- SQLite auto-detects Dokku's `/app/data` mount (or any path in `DB_SQLITE_PATH` / `DATA_DIR`).
- AI voice verification now reads `AI_BACKEND_URL` (falls back to `OLLAMA_URL`).

**Dokku commands on the VM:**

```bash
# Create app and persistent storage
sudo dokku apps:create backend
sudo mkdir -p /var/lib/dokku/data/storage/backend
sudo chown dokku:dokku /var/lib/dokku/data/storage/backend
sudo dokku storage:mount backend /var/lib/dokku/data/storage/backend:/app/data

# Environment (adjust host/IPs to your VM)
sudo dokku config:set backend \
  DB_BACKEND=sqlite \
  DB_SQLITE_PATH=/app/data/vaani.db \
   DATABASE_URL=sqlite:////app/data/vaani.db \
  OLLAMA_URL=http://172.17.0.1:11434 \
  AI_BACKEND_URL=http://172.17.0.1:8001 \
   AI_VERIFICATION_ENABLED=1 \
   PYTHONUNBUFFERED=1
```

> **Tip:** `172.17.0.1` is the Docker host IP inside containers. Run `ip addr show docker0` if it differs.

**Deploy from macOS (repo root):**
```bash
git remote add dokku-backend dokku@<VM-IP>:backend || true
git subtree push --prefix backend dokku-backend deployment_trails
```
(Substitute `deployment_trails` with whichever branch you are deploying.)

---

## Phase 5 – Frontend App (Vite React)

The `frontend/package.json` now includes:

```json
{
  "scripts": {
      "start": "serve -s dist -l $PORT"
  },
  "dependencies": {
    "serve": "^14.2.3"
  }
}
```

**Dokku setup:**
```bash
sudo dokku apps:create frontend
sudo dokku config:set frontend \
  NODE_ENV=production \
  VITE_API_BASE_URL=https://api.sunnationalbank.online \
   VITE_AI_BACKEND_URL=https://api.sunnationalbank.online \
   VITE_AI_API_BASE_URL=https://api.sunnationalbank.online
```

**Deploy from macOS:**
```bash
git remote add dokku-frontend dokku@<VM-IP>:frontend || true
git subtree push --prefix frontend dokku-frontend deployment_trails
```

Dokku will run `npm install`, `npm run build`, and finally `npm start` (which serves the `dist` folder with the `$PORT` Dokku injects).

---

## Phase 6 – Wiring Backend ↔ Ollama / AI

- The backend reads `AI_BACKEND_URL` (fallback `OLLAMA_URL`). Point it to `http://172.17.0.1:8001` if you also run the LangGraph AI process on the VM.
- If you only need direct Ollama calls, set `AI_BACKEND_URL` to `http://172.17.0.1:11434` where the system-wide Ollama service listens.
- For additional providers, set the usual env vars (`OPENAI_API_KEY`, etc.) through `dokku config:set backend ...`.

---

## Phase 7 – Cloudflare Tunnel & DNS

1. **Discover Dokku proxy ports:**
   ```bash
   sudo dokku proxy:report backend
   sudo dokku proxy:report frontend
   ```
   By default each app binds to `0.0.0.0:80` internally. If Dokku assigned random host ports, update the tunnel config accordingly.
2. **Create `/root/.cloudflared/config.yml`:**
   ```yaml
   tunnel: <TUNNEL-UUID>
   credentials-file: /root/.cloudflared/<TUNNEL-UUID>.json

   ingress:
     - hostname: sunnationalbank.online
       service: http://localhost:80        # Dokku frontend
     - hostname: api.sunnationalbank.online
       service: http://localhost:8080      # Replace with backend host port
     - service: http_status:404
   ```
3. **Route hostnames through the tunnel:**
   ```bash
   cloudflared tunnel route dns hackathon-tunnel sunnationalbank.online
   cloudflared tunnel route dns hackathon-tunnel api.sunnationalbank.online
   ```
4. **Run the tunnel (or create a systemd service):**
   ```bash
   cloudflared tunnel run hackathon-tunnel
   ```

Once running, traffic flows: public internet → Cloudflare Edge → tunnel → Dokku → containers.

---

## Phase 8 – Verification & Troubleshooting

- **Logs:** `dokku logs backend -t`, `dokku logs frontend -t`.
- **Health checks:** `curl http://localhost:<backend-port>/health` from the VM.
- **Database persistence:** `sudo ls /var/lib/dokku/data/storage/backend` should contain `vaani.db`.
- **Tunnel status:** `systemctl status cloudflared` (if you create a service) or monitor the CLI output.
- **Model performance:** ensure the VM has enough RAM/CPU; consider `ollama run llama3` once to warm caches.

---

## Next Steps / Optional Enhancements

- Convert the Cloudflare tunnel into a managed systemd service for auto-restart.
- Use Dokku's `letsencrypt` plugin if you later expose the VM directly.
- Add Dokku checks (`dokku checks:enable backend`) to keep containers healthy.
- Mirror the AI backend (`ai/` folder) as a third Dokku app if you want LangGraph workflows alongside the FastAPI backend.
