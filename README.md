# ApiPulse — API Monitoring & Observability Dashboard

ApiPulse is a full-stack API monitoring workspace built with FastAPI, SQLAlchemy, PostgreSQL-compatible persistence, scheduled health checks, and a React/Vite dashboard.

## Live demo

- **Frontend:** https://apipulse-api-monitoring-observability.onrender.com
- **Backend API:** https://apipulse-backend-ic6r.onrender.com
- **Interactive API docs:** https://apipulse-backend-ic6r.onrender.com/docs
- **Backend readiness:** https://apipulse-backend-ic6r.onrender.com/health

## Features

- Email/password registration and login
- Argon2 password hashing; plaintext passwords are never stored
- Signed JWT access tokens with expiry and protected endpoints
- Per-account monitoring workspaces and owner-scoped target CRUD
- Manual HTTP/HTTPS checks, status codes, response times, errors, and history
- Scheduled checks at 60-second intervals while the backend process is running
- Per-endpoint uptime percentage, successful/failed counts, and average latency
- Responsive React dashboard with sign-in/sign-up, token-backed requests, and sign-out
- Input validation, HTTP-aware API errors, CORS, SSRF guardrails, and automated tests

## Technology stack

**Backend:** Python, FastAPI, SQLAlchemy, Pydantic, PostgreSQL/SQLite, PyJWT, pwdlib/Argon2, APScheduler, requests, pytest.

**Frontend:** React 18, Vite 6, Tailwind CSS, Recharts, Lucide React, Node's built-in test runner.

## Run locally

### Backend

Use Python 3.12, create a virtual environment, and install dependencies:

    python -m venv .venv
    # Windows PowerShell: .venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    python -c "import secrets; print(secrets.token_urlsafe(48))"

Create a root .env file (never commit it) with:

    SECRET_KEY=paste-your-generated-random-key-here
    DATABASE_URL=sqlite:///./apipulse.db
    FRONTEND_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
    VITE_API_BASE_URL=http://127.0.0.1:8000

Start the backend from the repository root:

    uvicorn app.main:app --reload

API docs: http://127.0.0.1:8000/docs

### Frontend

Use Node.js 22, then run:

    npm ci
    npm run dev

Open the Vite URL printed in the terminal (usually http://localhost:5173).

## Authentication flow

1. POST /auth/register creates the account and stores an Argon2 hash.
2. POST /auth/login verifies the password and returns a signed JWT access token (30-minute expiry).
3. The browser stores the token in session storage and sends Authorization: Bearer <token> for protected requests.
4. GET /auth/me verifies the token and returns the current account.
5. Monitoring routes require authentication and filter targets by the current user's ID.
6. Sign-out clears the browser session token; expired sessions require signing in again.

Only the safe user response schema is returned; password hashes are never returned. This portfolio implementation keeps bearer tokens in browser JavaScript and is meant as a learning/demo architecture, not a complete hardened production auth system. Production extensions may include refresh-token rotation, rate limits, email verification, and stronger operational security monitoring.

## API routes

**Public**
- GET / — API welcome/status
- GET /health — readiness and database type
- POST /auth/register — create an account
- POST /auth/login — receive a JWT

**Authentication required**
- GET /auth/me — current account
- POST /target/ — create a monitored endpoint
- GET /target/ — list the current user's endpoints
- GET /target/{target_id} — read one owned endpoint
- PUT /target/{target_id} — update an owned endpoint
- DELETE /target/{target_id} — delete an owned endpoint and its history
- POST /target/{target_id}/check — run and save a health check
- GET /target/{target_id}/history — check history
- GET /target/{target_id}/stats — check statistics

Include Authorization: Bearer YOUR_ACCESS_TOKEN on protected requests.

## Tests

    python -m pytest -v
    npm test
    npm run build

Backend tests use an isolated in-memory SQLite database and don't touch local records.

## Render deployment notes

The backend reads SECRET_KEY and DATABASE_URL from the service environment. Keep SECRET_KEY in the Render backend's Environment settings; the Blueprint marks it as an unsynchronized secret. Do not commit a real .env or secret key to GitHub. CORS includes the deployed dashboard origins and the Authorization header.

The health endpoint reports database_type; verify that it says postgresql before relying on saved records. Local development falls back to SQLite if DATABASE_URL is not configured.

**Free-plan caveats:** Render free web services can sleep while idle, so in-process checks are not guaranteed to run continuously during sleep. The existing free PostgreSQL instance is scheduled to expire on November 19, 2026 unless the resource/plan changes. This is suitable for a portfolio demo, not guaranteed always-on monitoring or long-term data retention.

Existing demo targets from before account ownership have a nullable owner field. To preserve existing demo data, the first account registered after ownership is enabled adopts unowned legacy targets; later accounts only see their own targets.

## Observability notes

- Uptime percentage is successful recorded checks divided by total recorded checks, not wall-clock availability.
- URL checks reject common local/private destinations and validate redirect hops. These guard against common SSRF patterns, not a replacement for network-level egress controls.
- Startup creates missing tables and adds the owner column to existing target tables. A versioned Alembic migration workflow is a future improvement.
