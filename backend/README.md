# WoundCare API

FastAPI starter backend for private patient wound records and photo timelines.

## Run locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
uvicorn main:app --reload
```

Open http://localhost:8000/docs. SQLite is used by default for local development. Set `DATABASE_URL` to a PostgreSQL connection string for a PostgreSQL database.

## Environment variables

- `DATABASE_URL`: PostgreSQL URL (recommended for hosted use); local default is SQLite.
- `SECRET_KEY`: required strong random secret in production.
- `CORS_ORIGINS`: comma-separated trusted frontend origins, e.g. `https://your-app.vercel.app`.
- `UPLOAD_DIR`: private local upload directory for development only.

## Important deployment notes

This initial API is a development foundation, not yet production-ready for real patient data. The upload endpoint writes to local disk; ephemeral hosting filesystems are not durable. Before real patient photos are used, connect private object storage (S3-compatible), configure automated database migrations and backups, add rate limiting and account recovery, and complete a security/privacy review. Do not expose the upload directory as a public static folder. The API deliberately does not diagnose wounds or label images as infected/healed.
