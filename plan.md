# ApiPulse Frontend — Implementation Plan

## Product and integration

Build ApiPulse as a modular React + Vite JavaScript client, styled with Tailwind CSS and using Recharts, Lucide React, and the browser Fetch API. The existing FastAPI + PostgreSQL backend remains a separate service and is not replaced or edited. Keep its base URL in `VITE_API_BASE_URL` (`http://127.0.0.1:8000` by default) and all requests in a centralized client. Adapt to inspected response shapes: target `{id,name,url,created_at}`; check `{target_id,target_name,url,status_code,response_time_ms,is_healthy,error,check_id,checked_at}`; stats `{total_checks,successful_checks,failed_checks,uptime_percentage,average_response_time_ms}`; history envelope `{target_id,target_name,total_check,history}` with each record carrying `status_code,response_time_ms,is_healthy,error,checked_at`.

Important actual-backend deviations: the supplied history route is `POST /target/{id}/history`, not the requested `GET`, and its SQL filter uses `CheckResult.id == target_id` rather than `CheckResult.target_id == target_id`. Try the documented GET method first and fall back to POST only on HTTP 405. Document the query limitation and show an honest empty/partial state if the endpoint yields no relevant records. Statistics can be obtained per target from the implemented stats endpoint. Overall healthy/down counts require actual recent check records; target existence alone is never evidence of health. For unavailable status, surface “No check yet” / “Unknown”.

## Visual design

- **Design movement:** restrained industrial developer tooling, combining graphite surfaces with precise instrumentation-style accents.
- **Core principles:** data fidelity before decoration; high contrast and readable hierarchy; compact but breathable operational views; every status and action is explicit.
- **Color philosophy:** charcoal/graphite keeps long monitoring sessions calm; electric lime `#B8FF64` marks primary actions and confirmed health; teal `#36DCC8` distinguishes response-time/neutral telemetry; amber/red are reserved for caution/failure.
- **Layout paradigm:** fixed-feeling narrow navigation rail beside a broad, horizontally flowing monitoring canvas; stack panels and tables into a single column on mobile rather than squeezing desktop grids.
- **Signature elements:** fine telemetry rules and dot indicators; restrained lime outlines on focus/primary actions; tabular numeric typography for timings and counts.
- **Interaction philosophy:** actions give immediate, accessible feedback; destructive changes require clear confirmation; loading/unknown states stay distinct from healthy states.
- **Animation:** short opacity/position transitions for panels and dialogs, subtle hover/focus transitions, no perpetual motion or animation that obscures monitoring data; respect reduced-motion preferences.
- **Typography system:** Inter for interface copy, a compact monospace such as JetBrains Mono for URLs, timestamps and metrics; strong page headings, compact uppercase section labels, legible body text.
- **Brand essence:** dependable signal console for developers tracking their own APIs; precise, calm, candid.
- **Brand voice:** concise and operational. Examples: “Your endpoints, at a glance.” “No checks recorded yet—run a check to establish a baseline.”
- **Wordmark & logo:** custom pulse trace contained in a compact rounded square beside a bold ApiPulse wordmark; simple enough to remain crisp in the sidebar.
- **Signature brand color:** electric lime `#B8FF64`.

## Project structure and serving

- `src/main.jsx`: React entry point and global styles.
- `src/App.jsx`: application shell, navigation state, dashboard view composition.
- `src/components/`: sidebar/top bar, metric cards, endpoint table/cards, charts, dialogs, feedback and loading/empty states.
- `src/pages/`: overview, monitored APIs, check history, settings, and target details.
- `src/lib/api.js`: base URL, request/error handling, endpoint methods, response normalization.
- `src/lib/format.js`: time, duration, URL and status formatting.
- `src/index.css` and `tailwind.config.js`: shared tokens, responsive styles and motion.
- `public/manus-routes.json`: route manifest for the app's `/` page.
- `.env.example`: local API origin; no secrets.

Vite serves the frontend on port 3000. The FastAPI service stays on port 8000 and must allow the local frontend origins `http://localhost:3000` and `http://127.0.0.1:3000` through FastAPI CORS middleware. Preview hosting is for the frontend only; it does not proxy the separate local backend.

## Dependencies and constraints

Use React, Vite, Tailwind CSS, Recharts, Lucide React, and no fabricated monitoring data. Use actual backend responses only; create honest no-data/error states where an endpoint cannot provide usable data. Preserve the supplied backend unchanged; provide CORS and history-route/query recommendations as a separate integration note. No Manus server/database is needed for this client.
