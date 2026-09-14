# Production backend

## Environment

- Development uses `backend/.env`
- Production should use `backend/.env.production` (see `.env.production.example`)
- Never commit secrets
- Production refuses to start if JWT secrets are weak, missing, reused, if `CORS_ORIGIN=*`, if Firestore is not configured, or if Google Drive is not configured

## Run

```bash
cd backend
npx prisma generate
npm run build
npm run start:prod
```

Health check: `GET /health`

## Database

Firestore holds employees, attendance, leave, payroll, invoices, settings, and document metadata. Google Drive holds file bytes.

1. Snapshot with `npm run backup` (JSON export of Firestore collections)
2. Deploy the new API build
3. If something fails, restore the snapshot (see `docs/BACKUP.md`) and deploy the previous API build

## HTTPS and CORS

Terminate TLS at a reverse proxy. Set `CORS_ORIGIN` to the real admin origins. Do not use `*`.

## Logging

Production logs `error`, `warn`, and `log` only. The HTTP exception filter does not return stack traces to clients. Passwords and tokens must never be logged.

## File storage

Uploads stay private. MIME type is detected from file bytes, names are sanitized, and size is capped by `MAX_UPLOAD_SIZE_BYTES`. Only PDF, JPEG, and PNG are accepted.

When `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`, and `GOOGLE_DRIVE_FOLDER_ID` are set, document bytes go to a private Google Drive folder. Firestore stores the object key and metadata only. The mobile app never receives Google credentials.

Access is through JWT-protected `GET /documents/:id/file` (authenticated backend streaming). Documents are not given public Drive links.

If those Google Drive variables are missing in development, the API uses `STORAGE_LOCAL_DIR` (`backend/storage/`) and logs that local storage is the fallback. Production startup fails if Google Drive is missing.
