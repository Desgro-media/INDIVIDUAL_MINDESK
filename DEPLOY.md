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
- `JWT_SECRET` — `openssl rand -base64 64`. The backend now refuses to start
  if this is missing, blank, or the placeholder — see JwtUtil.validateSecret.
- `APP_BASE_URL` — leave the placeholder for now; you'll come back and set
  this to your Vercel URL after Part 2, then re-run `docker compose up -d`.
- `ALLOWED_ORIGINS` — same value as `APP_BASE_URL` once you know it. Leaving
  this blank falls back to allowing any origin, which is no longer
  acceptable now that this is a paid product — lock it down.
- `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` — your own superadmin login (see
  "Subscriptions & the superadmin dashboard" below). Leave both blank to skip
  provisioning one for now.
- `PLATFORM_UPI_ID` / `PLATFORM_UPI_QR_BASE64` — the UPI ID/QR your clients
  pay ₹9,999/year to. Shown on their in-app Subscription page.
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

### 7. Set up daily backups

There's no migration framework and no separate data volume — `individual_pgdata` (Postgres's data) lives
on the instance's root EBS volume, so "back up the database" means "snapshot the whole instance daily."
[`deploy/setup-ebs-backups.sh`](deploy/setup-ebs-backups.sh) wires this up via AWS Data Lifecycle Manager
(DLM) — a native AWS service, not a cron job running on the box itself, so it keeps working even if the
instance is unhealthy.

Run this from **your own machine** (or CloudShell) with the AWS CLI configured against the account the
instance lives in — not from inside the EC2 instance:

```bash
./deploy/setup-ebs-backups.sh <instance-id> <region> [retain-count] [snapshot-time-utc]
# e.g.
./deploy/setup-ebs-backups.sh i-0123456789abcdef0 us-east-1 7 02:00
```

This tags the instance, creates the (one-time, reusable) `AWSDataLifecycleManagerDefaultRole` IAM role if
it doesn't already exist, and creates a policy that snapshots every volume on the instance daily,
retaining the last 7 (default) snapshots. It's idempotent — re-run it any time to change the schedule or
retention count. The first snapshot won't appear until the next scheduled run; verify anytime with:

```bash
aws ec2 describe-snapshots --region <region> --filters Name=tag:mindesk:automated-backup,Values=true
```

**Restoring from a snapshot** (disaster recovery — instance lost, disk corrupted, or a bad manual
`ALTER TABLE`):
1. EC2 console → Snapshots → pick the most recent good one → **Create volume** (same AZ as your instance).
2. Stop the broken instance, detach its root volume, attach the new volume in its place as `/dev/sda1` (or
   `/dev/xvda`, whatever the original root device was), then start the instance.
3. Alternatively, launch a brand-new instance directly from the snapshot (Snapshots → **Create image**,
   then launch an instance from that AMI) if the original instance itself is unrecoverable, then re-point
   the Elastic IP at it.
4. Either way, `docker compose -f docker-compose.prod.yml up -d` on the restored instance brings the app
   back up against the restored data — no separate DB restore step needed, since the whole volume (Docker
   volumes included) came back with the snapshot.

This only protects against disk/data loss, not against a bad schema change mid-day — daily snapshots mean
up to 24h of data loss in the worst case. If that's ever not good enough, the next step up is `pg_dump`
on a tighter schedule (e.g. hourly) shipped somewhere off-instance (S3), which isn't set up here.

## Uptime monitoring

[`.github/workflows/uptime-check.yml`](.github/workflows/uptime-check.yml) pings `/actuator/health` every
5 minutes from GitHub's infrastructure (not the EC2 box — so it still fires if the whole instance is
down) and posts a Telegram alert on failure. One-time setup:

1. **Get a Telegram bot token** — message [@BotFather](https://t.me/BotFather) on Telegram, `/newbot`,
   follow the prompts. (A separate bot from `TELEGRAM_BOT_TOKEN` if you're using that integration too —
   keep alerting and patient-facing notifications on different bots.)
2. **Get your chat ID** — message your new bot anything, then visit
   `https://api.telegram.org/bot<token>/getUpdates` in a browser and read `message.chat.id` from the
   JSON response.
3. **Add repository secrets** — GitHub repo → Settings → Secrets and variables → Actions → New repository
   secret:
   - `HEALTH_CHECK_URL` — e.g. `https://3-15-20-100.sslip.io/actuator/health` (your real `DOMAIN`)
   - `MONITOR_TELEGRAM_BOT_TOKEN` — from step 1
   - `MONITOR_TELEGRAM_CHAT_ID` — from step 2
4. **Test it** — Actions tab → "Uptime check" workflow → **Run workflow** (the `workflow_dispatch`
   trigger lets you fire it on demand instead of waiting for the schedule). Temporarily stop the backend
   container (`docker compose -f docker-compose.prod.yml stop individual-backend`) and re-run to confirm
   the Telegram alert actually arrives, then start it back up.

It alerts on *every* failed check, not just the first, so a prolonged outage keeps nudging you every 5
minutes instead of going silent after one ping.

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
confirmations, tracking links), so it should point at the live frontend. Set
`ALLOWED_ORIGINS` to the same value (see Part 1) so CORS is locked to your
actual frontend domain instead of allowing any origin.

## Subscriptions & the superadmin dashboard

New practitioners get a 14-day free trial from signup; after that (or after a
year of paid access), their dashboard locks until you manually verify a
payment. Their public booking page keeps working the whole time — only the
dashboard is gated.

1. **You log in** at `https://<your-frontend-domain>/superadmin/login` with
   `SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD` (seeded once at backend startup —
   restart the backend after first setting them).
2. **The client pays** you ₹9,999/year via GPay/UPI to `PLATFORM_UPI_ID`,
   outside the app — there's no payment gateway integration.
3. **The client submits proof** from their own dashboard's Subscription page:
   the UPI transaction reference (UTR) and optionally a screenshot.
4. **You review and approve/reject** it from `/superadmin/dashboard`'s
   "Pending Payment Reviews" queue. Approving activates their subscription
   for a year (extending from their current period end if they renewed
   early); rejecting asks them to resubmit, with your reason shown to them.
5. You can also manually activate or suspend any tenant directly from the
   tenant table (comps, refunds, abuse) without a submitted payment proof.

Every account that existed before this feature shipped was grandfathered in
as unrestricted — the trial/expiry clock only applies to accounts created
from here on.

## One-time database fix: deploying the clinic/staff feature

This app has no migration framework — Hibernate's `ddl-auto=update` adds new
*nullable* columns automatically, but Postgres refuses two things it can't do
safely on a table that already has rows: adding a `NOT NULL` column with no
default, and relaxing an existing `NOT NULL` constraint. The clinic/staff
feature needs both on `app_user` (`enabled boolean NOT NULL` for staff
deactivation, and `slug` becoming nullable for staff rows). On a **fresh**
database this is a non-issue; on any database that already has accounts in
it (including this project's own dev/prod databases as of when this feature
shipped), the backend will crash on startup with
`column "enabled" of relation "app_user" contains null values` until you run
this once:

```bash
docker compose -f docker-compose.prod.yml exec individual-db \
  psql -U individual -d individual -c \
  "ALTER TABLE app_user ADD COLUMN enabled boolean NOT NULL DEFAULT true;"
docker compose -f docker-compose.prod.yml exec individual-db \
  psql -U individual -d individual -c \
  "ALTER TABLE app_user ALTER COLUMN slug DROP NOT NULL;"
```
(swap the exec target/db name for your actual container/db if you customized
`docker-compose.prod.yml`). Then start/restart the backend normally.

## Redeploying after code changes
```bash
git pull
docker compose -f docker-compose.prod.yml up --build -d
```
Vercel redeploys the frontend automatically on every push to the branch it's
tracking.
