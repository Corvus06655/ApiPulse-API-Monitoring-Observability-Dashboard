# ApiPulse — API Monitoring & Observability Dashboard

ApiPulse is a full-stack API-monitoring project with a FastAPI backend, SQLAlchemy persistence, scheduled health checks, a PostgreSQL-compatible database layer, and a React/Vite dashboard.

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
- `render.yaml`: Render blueprint for the backend, frontend, and database
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

## Render deployment

The `render.yaml` blueprint defines:
- A Python web service named `apipulse-backend`
- A static site named `ApiPulse-API-Monitoring-Observability-Dashboard`
- A PostgreSQL database named `apipulse-db`

Deploy the blueprint from Render's dashboard using this repository and the `main` branch. Review Render's pricing/expiration rules for free resources before relying on the free PostgreSQL instance for long-term data retention. Free web services may sleep when idle, so the 60-second scheduler is not a guaranteed always-on monitoring service on a sleeping instance.

The static frontend must use `VITE_API_BASE_URL` pointing to the public HTTPS backend URL. The backend's `FRONTEND_ORIGIN` must include the deployed frontend origin. Render uses `/health` for a readiness check, including a simple database connectivity test.

## API routes

- `GET /` — API welcome/status response
- `GET /health` — readiness check including database connectivity
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
