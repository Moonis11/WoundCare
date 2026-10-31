# WoundCare API

FastAPI API for WoundCare accounts and patient-owned records. Patients can only read and update their own workspace. Admin accounts are created separately using a one-time bootstrap token; there is no doctor role.

## Run locally

\`\`\`bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export SECRET_KEY="$(python -c 'import secrets; print(secrets.token_urlsafe(48))')"
uvicorn main:app --reload
\`\`\`

The local default is SQLite. For PostgreSQL, set \`DATABASE_URL\` before starting. The API docs are at http://localhost:8000/docs and the health endpoint is /health.

## Deploy

Deploy the \`backend/\` directory as its own service. Use the included Dockerfile. Configure these backend environment variables:

- \`DATABASE_URL\`: managed PostgreSQL connection string.
- \`SECRET_KEY\`: random value with at least 32 characters; never commit it.
- \`ADMIN_BOOTSTRAP_TOKEN\`: separate random token, used once to create the admin account.
- \`ENVIRONMENT=production\`.
- \`CORS_ORIGINS\`: exact frontend origin(s), comma-separated.
- \`UPLOAD_DIR\`: private persistent path if using the legacy photo endpoint.

Set \`NEXT_PUBLIC_API_URL\` in Vercel to the API's HTTPS origin and redeploy the frontend. The frontend keeps its prior local-only mode when this variable is empty. With the API configured, it stores the bearer token in session storage and syncs the signed-in user's workspace.

### Create the first admin

Keep the bootstrap token private. After the API is deployed, call \`POST /auth/admin/bootstrap\` once with \`full_name\`, \`email\`, \`password\` (at least 12 characters), and \`bootstrap_token\`. Then remove \`ADMIN_BOOTSTRAP_TOKEN\` from the host settings. Public sign-up can only create patient accounts.

## Data model and limits

The API stores each authenticated user's wound records and profile in a private PostgreSQL workspace. The current frontend synchronizes records as JSON, including compressed photo data, with a 25 MB request limit. The existing per-photo upload endpoints also require authentication and serve images with private no-store caching. Admin endpoints expose user summaries and audit metadata, not wound contents.

## Current deployment boundary

This is an initial backend integration, not a completed clinical production service. Do not use real patient data until the service is deployed over HTTPS with managed PostgreSQL backups, durable private photo storage, account recovery, rate limiting, retention/deletion policies, and a security/privacy review. The current JSON sync is intended for a small pilot; it is not a substitute for a scalable media-storage pipeline. The app does not diagnose wounds or prescribe treatment.
