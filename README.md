# ApiPulse — API Monitoring & Observability Dashboard

ApiPulse is a full-stack API-monitoring project with a FastAPI backend, SQLAlchemy persistence, scheduled health checks, a PostgreSQL-compatible database layer, and a React/Vite dashboard.

## Live deployment

- **Frontend:** https://apipulse-api-monitoring-observability.onrender.com
- **Backend API:** https://apipulse-backend-ic6r.onrender.com
- **Interactive API docs:** https://apipulse-backend-ic6r.onrender.com/docs
- **Backend readiness:** https://apipulse-backend-ic6r.onrender.com/health

The frontend and backend are deployed on Render. Before relying on saved records, configure the backend's `DATABASE_URL` to use the Render PostgreSQL instance as described in [Render database setup](#render-database-setup). The backend currently falls back to local SQLite if `DATABASE_URL` is missing; on a Render free web service, local files can be lost on restart, redeploy, or idle spin-down.

## Features

- Register, list, update, and delete monitored API targets
- Run manual HTTP/HTTPS health checks and persist each result
- Automatically check registered targets at 60-second intervals while the backend service is running
- Browse per-target check history and statistics
- Show successful and failed checks, uptime percentage, and average response time
- Dashboard with real backend data, empty states, errors, and no invented metrics
- Public-host validation to block obvious localhost/private-network SSRF attempts
- Automated backend and frontend API-client tests

## Stack

FastAPI, Python 3.12, SQLAlchemy, PostgreSQL, APScheduler, requests, pytest, React 18, Vite 6, Tailwind CSS, Recharts, Lucide React.

## Repository structure

- `app/`: FastAPI app, database setup, models, schemas, target routes, checker, and scheduler
- `src/`: React frontend and API client
- `test/`: backend tests using an isolated in-memory SQLite database
- `render.yaml`: Render service configuration; the database reference expects the existing `apipulse-db` resource
- `.env.example`: local frontend configuration

## Local development

### Backend

Create and activate a virtual environment, then install dependencies:

```bash
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend uses `DATABASE_URL` if present. Without it, local development falls back to SQLite at `./apipulse.db`.

Open `http://127.0.0.1:8000/docs`.

### Frontend

Node.js 22 is pinned in `.node-version`.

```bash
npm ci
cp .env.example .env
npm run dev
```

Open the Vite URL printed by the command. On Windows, copy `.env.example` to `.env` manually if `cp` is unavailable. By default, the frontend uses `http://127.0.0.1:8000`.

## Tests

Backend:

```bash
python -m pytest -v
```

Frontend API client:

```bash
npm test
npm run build
```

The backend tests use an isolated in-memory SQLite database and do not modify the developer's local data.

## Render database setup

A free Render PostgreSQL resource named `apipulse-db` has been created. To attach it to the live backend without copying credentials into GitHub or chat:

1. Open the [apipulse-db Render dashboard](https://dashboard.render.com/d/dpg-dbbi8ebrjlhs73ebu79g-a).
2. Use **Connect** and copy the **Internal Database URL**.
3. Open the [apipulse-backend environment settings](https://dashboard.render.com/web/srv-dbbi8q8n74is73cq00rg).
4. Add/update `DATABASE_URL` with that Internal Database URL and save/redeploy.
5. Open the [readiness endpoint](https://apipulse-backend-ic6r.onrender.com/health). It should report `"database_type": "postgresql"`. If it reports `"sqlite"`, the service has not switched over yet.

Do not commit the database URL into this repository. The backend accepts Render's PostgreSQL URL via the `DATABASE_URL` environment variable. The health endpoint reports both connection status and the active SQLAlchemy backend type.

**Free-plan limitation:** Render free PostgreSQL resources expire 30 days after creation, and free web services may sleep when idle. This setup is suitable for a portfolio demo, not guaranteed always-on production monitoring or long-term data retention. Upgrade the database before its displayed expiry date if you need to keep data long term.

## API routes

- `GET /` — API welcome/status response
- `GET /health` — readiness check including connection status and database type
- `POST /target/` — create target
- `GET /target/` — list targets
- `GET /target/{target_id}` — get target
- `PUT /target/{target_id}` — update target
- `DELETE /target/{target_id}` — delete target and its associated check records
- `POST /target/{target_id}/check` — run and save an on-demand check
- `GET /target/{target_id}/history` — read that target's check history
- `GET /target/{target_id}/stats` — summary statistics

A hidden POST compatibility alias remains for history clients that used the original nonstandard method.

## Notes

- Uptime percentage is calculated as successful checks divided by recorded checks, not as wall-clock availability.
- URL checks reject obvious local/private destinations and manually validate redirects. This is a guard against common SSRF risks, not a substitute for network-level egress restrictions in a hardened production service.
- Persistent database migrations are not yet managed by Alembic; the app currently creates missing tables on startup.
