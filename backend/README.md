# WoundCare API

FastAPI service for patient-owned wound records and a single administrator role. Patients can access only their own workspace. There is no doctor role.

## Run locally

\`\`\`bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
uvicorn main:app --reload
\`\`\`

The local default is SQLite. Set \`DATABASE_URL\` to use PostgreSQL. API docs are at http://localhost:8000/docs and health is at /health.

## Deploy

Deploy the \`backend/\` directory as a separate service with the included Dockerfile. Configure:

- \`DATABASE_URL\`: managed PostgreSQL connection string.
- \`SECRET_KEY\`: a random value with at least 32 characters.
- \`ADMIN_BOOTSTRAP_TOKEN\`: a separate long random value for one-time admin creation.
- \`ENVIRONMENT=production\`.
- \`CORS_ORIGINS\`: exact frontend origin(s), comma-separated.
- \`UPLOAD_DIR\`: private persistent path if using the legacy photo upload endpoints.

Set \`NEXT_PUBLIC_API_URL\` in Vercel to the API's HTTPS origin and redeploy. The frontend retains browser-local demo mode when that variable is unset. In API mode, bearer tokens are held in session storage and the authenticated patient's workspace is synchronized with the API.

## Create the first admin

Use \`POST /auth/admin/bootstrap\` once with \`full_name\`, \`email\`, \`password\` (at least 12 characters), and \`bootstrap_token\`. Keep the bootstrap token secret, then remove it from the hosting environment. Public registration can create patient accounts only.

## Data and limits

Each patient's wounds and profile are stored in a private PostgreSQL workspace. Wound records carry an extensible `woundType` (new records default to `diabetic_foot`) and optional `protocolData` JSON so future wound-specific fields can be added without changing the shared photo, measurement, and timeline model. Only the diabetic-foot MVP workflow is currently implemented; other type values are reserved for later phases. The current frontend sends compressed photo data as part of the workspace JSON, capped at 3 MB per sync on Vercel. The existing photo upload routes are also authenticated and return private, no-store responses. Admin endpoints return patient account summaries and audit metadata, not clinical record contents.

## Deployment boundary

This is an initial backend integration, not a completed clinical production service. Do not use real patient data until HTTPS, managed database backups, durable private photo storage (for example, direct client uploads to Vercel Blob), account recovery, rate limiting, data retention/deletion policies, and a security/privacy review are complete. The JSON sync approach is for a small pilot, not a scalable media pipeline. The app does not diagnose wounds or prescribe treatment.
