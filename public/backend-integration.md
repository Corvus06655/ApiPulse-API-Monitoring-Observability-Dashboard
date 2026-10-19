# ApiPulse backend integration notes

The frontend expects the existing FastAPI app on `http://127.0.0.1:8000` by default. No backend file was changed by this frontend task.

## Minimal local CORS configuration

Install/import FastAPI's built-in `CORSMiddleware` in the existing backend's `app/main.py`. Add this immediately after the `FastAPI(...)` app is constructed and before/after `include_router` (either is fine):

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Accept", "Content-Type"],
)
```

The frontend does not send cookies or authorization credentials, so `allow_credentials=False` is sufficient. If you run Vite on a different port, add that exact local origin instead. Avoid `allow_origins=["*"]` for a deployed service. CORS only applies when the browser's frontend and API have different origins.

## Supplied history route discrepancy

The supplied `app/router/targets.py` defines history as `POST /target/{target_id}/history`, although the requested API contract calls for GET. The frontend requests GET first and falls back to POST on HTTP 405, so it can talk to either variant.

The current query filters `CheckResult.id == target_id`. That compares the check row's primary key to the target ID, and does not return all checks for that target. The frontend rejects rows whose returned `target_id` belongs to a different API, but this cannot restore omitted rows.

If you choose to correct the backend (optional; not applied automatically), change only the history decorator and filter in that existing route:

```python
@router.get("/{target_id}/history")
def get_target_history(target_id: int, db: Session = Depends(get_db)):
    # Keep the existing target existence check above this query.
    history = (
        db.query(CheckResult)
        .filter(CheckResult.target_id == target_id)
        .order_by(CheckResult.checked_at.desc())
        .all()
    )
    # Keep the existing response envelope: target_id, target_name, total_check, history.
```

After that correction, the frontend's GET request is used directly; its POST fallback remains harmless compatibility for older backend instances. The target stats endpoint already filters by `CheckResult.target_id` and is read as supplied.
