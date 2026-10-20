# ApiPulse — API Monitoring & Observability Dashboard

ApiPulse is a full-stack API-monitoring project with a FastAPI backend, SQLAlchemy persistence, scheduled health checks, a PostgreSQL-compatible database layer, and a React/Vite dashboard.

## Live deployment

- **Frontend:** https://apipulse-api-monitoring-observability.onrender.com
- **Backend API:** https://apipulse-backend-ic6r.onrender.com
- **Interactive API docs:** https://apipulse-backend-ic6r.onrender.com/docs
- **Backend readiness:** https://apipulse-backend-ic6r.onrender.com/health

The frontend and backend have been deployed on Render. The backend falls back to local SQLite when `DATABASE_URL` is not configured. A Render free web service has an ephemeral filesystem, so SQLite is only a temporary fallback for the demo; use the existing Render PostgreSQL instance before relying on saved monitoring records.

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
- `render.yaml`: Render Blueprint for the existing backend, frontend, and PostgreSQL resource
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

## Render PostgreSQL setup

A free PostgreSQL resource named `apipulse-db` already exists in the Render workspace. The Blueprint references it using `fromDatabase`, so Render can populate `DATABASE_URL` without exposing database credentials in source control.

1. Open the [Render Dashboard](https://dashboard.render.com/).
2. Choose **New → Blueprint**, then connect this repository and select the `main` branch. Render uses [Blueprints](https://render.com/docs/infrastructure-as-code) to apply the linked configuration to existing resources whose names match the YAML.
3. Review the preview before applying it. It should update the existing `apipulse-backend` service and `ApiPulse-API-Monitoring-Observability-Dashboard` static site, and reference the existing `apipulse-db` database. **Do not deploy if the preview proposes duplicate services or a new database**; stop and review the resource names first.
4. Deploy/sync the Blueprint.
5. Open the [readiness endpoint](https://apipulse-backend-ic6r.onrender.com/health). It should report `"database_type": "postgresql"`. If it says `"sqlite"`, the database reference has not been applied yet.

Do not copy the database URL into GitHub or chat. The backend accepts Render's PostgreSQL URL through the `DATABASE_URL` environment variable.

**Free-plan limitation:** the current free PostgreSQL instance expires on **November 19, 2026**. Render free web services can sleep after 15 minutes without inbound traffic, so the 60-second in-process scheduler is not guaranteed to run continuously while the service sleeps. This is suitable for a portfolio demo, not guaranteed always-on production monitoring or long-term data retention.

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
