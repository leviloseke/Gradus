# Gradus

A self-hosted, multi-user workout tracker built around **progressive overload**. Configure each exercise once (warm-up scheme, working sets, rep range, progression rule) — then just log your sets and let Gradus calculate warm-up weights and suggest next-session progression.

## Quick start

```bash
cp .env.example .env   # set JWT_SECRET and a real POSTGRES_PASSWORD
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5001
- Postgres: localhost:5432

The database schema migrates and the default exercise library seeds automatically on backend startup.

## How progression works

Each exercise template defines a target rep range (default 5–8), which sets count as max effort (default the last 2), and an increment (default +5 lbs):

- If you haven't hit the top of the rep range on your max-effort sets, Gradus suggests **+1 rep** next session.
- Once you hit the top of the range on all max-effort sets, it suggests **+increment weight** and resets reps to the bottom of the range.
- Deload sessions reduce the working weight ~10% and are excluded from progression history.

Warm-up weights are auto-calculated from the working weight using each warm-up set's configured percentage, rounded to 2.5.

## Local development

```bash
# database
docker-compose up postgres

# backend (http://localhost:5001, proxied by Vite)
cd backend
npm install
DATABASE_URL=postgres://gradus:gradus@localhost:5432/gradus JWT_SECRET=dev-secret PORT=5001 npm run dev

# frontend (http://localhost:3000, proxies /api to :5001)
cd frontend
npm install
npm run dev
```

## Stack

- **Frontend** — React + Vite + TailwindCSS, served by Nginx (proxies `/api` to the backend)
- **Backend** — Node.js / Express
- **Database** — PostgreSQL 15
- **Auth** — JWT in httpOnly cookies, bcrypt password hashing, per-user data isolation

## API surface

Auth (`/api/auth/*`), programs and days (`/api/programs/*`), exercise templates (`/api/exercises/*`, including `/next` suggestions, `/history`, `/stats`), sessions and set logs (`/api/sessions/*`, including `/plan` for a session's planned exercises with suggestions), body weight (`/api/body-weight`), progression overview (`/api/stats/progression`), and exports (`/api/export/csv`, `/api/export/all`). Apple Health endpoints are stubbed (`501`) with schema tables in place for a future integration.

## Production deployment

Gradus is designed to run on a home server or VPS behind a TLS-terminating reverse proxy pointed at the frontend container (port 3000). The frontend's nginx already proxies `/api` to the backend, so the proxy only needs one upstream.

**Caddy** (automatic HTTPS):

```
gradus.example.com {
    reverse_proxy localhost:3000
}
```

**nginx**:

```nginx
server {
    listen 443 ssl;
    server_name gradus.example.com;
    ssl_certificate     /etc/letsencrypt/live/gradus.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gradus.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

When serving over HTTPS, set in `.env`:

```bash
COOKIE_SECURE=true                          # auth cookies get the Secure flag
CORS_ORIGIN=https://gradus.example.com      # the origin you open the app at
```

Auth cookies are sent without the `Secure` flag by default so the app works over plain HTTP on localhost or a LAN.

## Backup & restore

All state lives in the `postgres_data` Docker volume. To back up:

```bash
docker compose exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > gradus-$(date +%F).sql
```

To restore into a fresh database:

```bash
cat gradus-2026-06-10.sql | docker compose exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

A nightly cron entry on the host is enough for most self-hosted setups:

```cron
0 3 * * * cd /path/to/gradus && docker compose exec -T postgres pg_dump -U gradus gradus > backups/gradus-$(date +\%F).sql
```

Users can also export their own data anytime from **Settings → Data export** (CSV or JSON).
