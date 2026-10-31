# WoundCare

WoundCare records wound photos, measurements, patient-reported observations, and follow-up dates. It does not diagnose wounds or recommend treatment.

## Frontend

\`\`\`bash
npm install
npm run dev
\`\`\`

Without \`NEXT_PUBLIC_API_URL\`, the app keeps its browser-local demo mode. To use server accounts, set \`NEXT_PUBLIC_API_URL\` to the deployed FastAPI HTTPS origin in the Vercel project settings, then redeploy.

## Backend

See [backend/README.md](backend/README.md) for local FastAPI setup, PostgreSQL configuration, first-admin bootstrap, and deployment.

The API stores one private wound workspace per signed-in patient. Patients can only access their own workspace. The admin account is provisioned separately; there is no doctor role yet.

## Deployment status

Repository code includes a FastAPI service and PostgreSQL-backed workspace API. A live API is not available until the backend is deployed with a managed PostgreSQL database and its environment variables are configured. The Railway app connection currently needs reauthentication before I can provision or deploy it.

Do not use real patient data until HTTPS, database backups, durable photo storage, access policies, account recovery, retention/deletion, and security/privacy review are complete.
