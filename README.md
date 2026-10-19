# ApiPulse-API-Monitoring-Observability-Dashboard

## ApiPulse — API Monitoring & Observability Dashboard

> A developer-focused API health and response-time dashboard, built with React and connected to an existing FastAPI monitoring service.

## Live demo

- **Frontend:** https://apipulse-api-monitoring-observability.onrender.com
- **Backend health endpoint:** Not deployed yet; the Render free Web Service plan is unavailable in the current account.

## Project links

- **Source repository:** https://github.com/Corvus06655/ApiPulse-API-Monitoring-Observability-Dashboard
- **Render frontend URL:** https://apipulse-api-monitoring-observability.onrender.com

## What it does

ApiPulse gives engineers one place to manage monitored endpoints, inspect the latest known health state, run an on-demand check, review backend statistics and browse available check history. The frontend is responsive and includes Overview, Monitored APIs, Check History and Settings views, plus create/edit forms, a target-details drawer, delete confirmation and live connection testing.

Monitoring data is always read from the configured backend. A target is never marked healthy merely because it exists. If no check record is available, the UI says “No check yet”; if the backend has not returned enough real timestamped samples, the response-time chart shows an empty state rather than invented points. When a production backend URL is not configured, the dashboard reports that state instead of trying localhost or showing false zero metrics.

## Built with

React 18 · Vite 6 · JavaScript · Tailwind CSS · Recharts · Lucide React · Fetch API

## Architecture

- `src/App.jsx` — responsive application shell, navigation and CRUD/check orchestration.
- `src/pages/` — Overview, Monitored APIs, Check History and Settings.
- `src/components/` — status/metric cards, chart, history table, loading/empty states and accessible dialogs.
- `src/lib/api.js` — centralized Fetch client, request methods, JSON/error handling, environment-aware API URL and history-method compatibility.
- `src/lib/useDashboardData.js` — real target, per-target stats and history loading/aggregation.
- `public/backend-integration.md` — minimal local CORS setup and the supplied backend's history-route/query discrepancy.
- `public/manus-routes.json` — declared application route.

The frontend stays separate from the supplied FastAPI + PostgreSQL backend. No backend code is replaced or modified.

## Run locally

Requirements: Node.js 20.19+ (or 22.12+) and pnpm 11.25.0.

```bash
pnpm install
cp .env.example .env
# Start the existing FastAPI app separately on http://127.0.0.1:8000
pnpm dev
```

Open `http://localhost:3000`. Set `VITE_API_BASE_URL` in `.env` if FastAPI is running at a different address. For local development, allow the frontend origins `http://localhost:3000` and `http://127.0.0.1:3000` in FastAPI CORS; see [backend integration notes](public/backend-integration.md).

A remote static site cannot reach a backend running only at `127.0.0.1` on your computer. For live monitoring data, set the frontend build environment variable `VITE_API_BASE_URL` to a publicly reachable HTTPS FastAPI origin and allow the deployed site origin in backend CORS. Until configured, production builds report that the backend URL is missing; they do not silently use localhost or fabricate data.

## Validate

```bash
pnpm test
pnpm build
```

The API-client tests cover development/production API URL resolution, endpoint paths, HTTP methods, JSON bodies, history-method fallback and FastAPI error details.

## Backend contract note

The supplied FastAPI code exposes `POST /target/{id}/history`, although the requested contract says GET. The frontend first tries GET and falls back to POST on HTTP 405, supporting both versions. The supplied SQL query also filters `CheckResult.id == target_id` rather than `CheckResult.target_id == target_id`, which can omit or return another target's rows. The UI filters out rows explicitly belonging to a different target and reports the resulting timeline as potentially incomplete. The optional correction is documented separately; no backend files were changed.

## Resume summary

Built a responsive API-monitoring dashboard with React, Vite, Tailwind CSS and Recharts; integrated target CRUD, manual checks, per-target statistics and history with an existing FastAPI service; and implemented loading/error/empty states with a strict no-fabricated-metrics policy.
