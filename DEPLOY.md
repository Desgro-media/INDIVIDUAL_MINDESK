# Deploying: frontend on Vercel, backend + db on EC2 (Docker)

## Part 1 — EC2: backend + Postgres

### 1. Launch the instance
- AWS Console → EC2 → Launch instance
- AMI: **Ubuntu Server 22.04 LTS**
- Instance type: **t3.small** (2 GB RAM). A JVM + Postgres in separate containers
  is tight on a 1 GB `t2/t3.micro` — it'll run but may swap under load.
- Key pair: create/download one for SSH
- Security group — inbound rules:
  - `22` (SSH) — from your IP only
  - `80` (HTTP) — from anywhere (needed for the Let's Encrypt certificate challenge)
  - `443` (HTTPS) — from anywhere
  - Do **not** open `8087` or `5433` — the backend and db are only reachable
    through Caddy on 443, via the internal Docker network.
- Storage: default 20–30 GB gp3 is plenty

### 2. Allocate an Elastic IP
EC2 → Elastic IPs → Allocate, then Associate it with the instance. This keeps
the public IP fixed across reboots — required since the sslip.io hostname
encodes the IP directly.

### 3. Install Docker
SSH in (`ssh -i your-key.pem ubuntu@<elastic-ip>`), then:
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

### 4. Get the code onto the instance
```bash
git clone <your-repo-url> individual-mindesk
cd individual-mindesk
```

### 5. Configure secrets
```bash
cp .env.prod.example .env
nano .env
```
Fill in:
- `DOMAIN` — take your Elastic IP, e.g. `3.15.20.100`, replace dots with dashes:
  `3-15-20-100.sslip.io`. This resolves to your instance with no domain
  purchase needed, and Caddy will get it a real Let's Encrypt certificate.
- `DB_PASSWORD` — `openssl rand -base64 32`
- `JWT_SECRET` — `openssl rand -base64 64`
- `APP_BASE_URL` — leave the placeholder for now; you'll come back and set
  this to your Vercel URL after Part 2, then re-run `docker compose up -d`.
- Everything else (Resend, Twilio, Telegram, Google, AI chat) is optional —
  leave blank to run without those features.

### 6. Start the stack
```bash
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml logs -f individual-backend
```
Wait for the healthcheck to pass, then verify from your own machine:
```bash
curl https://3-15-20-100.sslip.io/actuator/health
```
(swap in your actual `DOMAIN`). You should get `{"status":"UP"}` over a
valid HTTPS connection — Caddy issued the cert automatically on first request.

## Part 2 — Vercel: frontend

1. vercel.com → Add New Project → import this GitHub repo
2. **Root Directory**: set to `frontend` (this is a monorepo — Vercel must
   build from the `frontend/` subfolder, not the repo root)
3. Framework preset: Next.js (auto-detected)
4. Environment variables:
   - `NEXT_PUBLIC_API_URL` = `https://<your-DOMAIN>/api/v1`
     (same domain as Part 1, e.g. `https://3-15-20-100.sslip.io/api/v1`)
   - `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` = your bot username, if you use the
     Telegram integration (optional)
5. Deploy

## Part 3 — close the loop

Once you have the real Vercel URL (e.g. `https://individual-mindesk.vercel.app`):
```bash
# back on the EC2 instance
nano .env   # set APP_BASE_URL to the Vercel URL
docker compose -f docker-compose.prod.yml up -d   # picks up the new env var
```
`APP_BASE_URL` is used to build links sent out in emails/SMS/WhatsApp (booking
confirmations, tracking links), so it should point at the live frontend.

CORS on the backend already allows all origins
(`backend/src/main/java/com/patientbook/security/SecurityConfig.java:84`), so
no backend code change is needed for the Vercel domain to be allowed to call
the API.

## Redeploying after code changes
```bash
git pull
docker compose -f docker-compose.prod.yml up --build -d
```
Vercel redeploys the frontend automatically on every push to the branch it's
tracking.
