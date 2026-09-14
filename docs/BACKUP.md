# Backup and restore

Backups are server-side only. There is **no** public or mobile API for restore.

## What is backed up

- Firestore collections (JSON export)
- Uploaded employee documents under `STORAGE_LOCAL_DIR` (default `storage/`) when local fallback is in use
- Live document files stored in Google Drive when Drive is configured
- Backup attempts are recorded in `backup_logs`

## Configure Google Drive

Cloud storage uses a dedicated Google account and a private Drive folder. Credentials stay on the backend.

1. Create a Google Cloud project and enable the **Google Drive API**.
2. Create OAuth credentials (Desktop or Web application).
3. Obtain a refresh token with Drive access for a dedicated operator account. Recommended scope: `https://www.googleapis.com/auth/drive.file`.
4. Create a private Drive folder for this application. Copy its folder ID from the URL (`folders/<id>`).
5. Set backend environment variables:

```bash
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REFRESH_TOKEN=
GOOGLE_DRIVE_FOLDER_ID=
```

Do not put these values in the mobile app. Do not make the folder publicly shared. Google Drive is not live until these values are set and a real upload has been verified.

The app creates two private subfolders under `GOOGLE_DRIVE_FOLDER_ID`:

- `documents/<employeeId>/` for employee files
- `backups/<YYYY-MM-DD>/` for Firestore JSON dumps

Files are not given public sharing links. Employee documents are downloaded only through JWT-protected `GET /documents/:id/file`.

## Local development fallback

If the Google Drive variables are empty in development, the API uses `backend/storage/` and logs:

`Google Drive not configured — using local storage.`

The process does not crash. Production startup fails if Google Drive is missing.

## Location and security

- Default local directory: `backend/backups/`
- This directory is gitignored
- Keep backups off the public web root
- Do not commit `.env`, dump files, or uploaded documents
- Google credentials stay on the backend only

## Daily backup

From `backend/`:

```bash
npm run backup
npm run backup:files
```

`npm run backup` flow:

1. Export Firestore collections to a local JSON file
2. Verify the dump exists and is not empty
3. Upload the dump to Google Drive `backups/<date>/` when Drive is configured
4. Verify the uploaded file size
5. Apply retention (default 7 days via `BACKUP_RETENTION_DAYS`)
6. Report success or failure

If the database dump succeeds but Google Drive upload fails, the command exits non-zero, the backup is **not** marked complete, and the local dump is kept for recovery.

Retention deletes only files tagged as database backups. Employee documents are not removed by backup retention.

Schedule with Task Scheduler (Windows) or cron:

```text
0 2 * * * cd /path/to/backend && npm run backup && npm run backup:files
```

Take a Firestore backup before every production deploy:

```bash
npm run backup
```

## Restore Firestore from a local dump

Requires an operator confirmation flag. This will overwrite data.

```bash
# PowerShell
$env:CONFIRM_RESTORE="YES"
$env:BACKUP_FILE="backups/database/PROJECT-TIMESTAMP.json"
$env:FILES_BACKUP_DIR="backups/files/documents-TIMESTAMP"
npm run restore
```

```bash
# bash
CONFIRM_RESTORE=YES \
BACKUP_FILE=backups/database/PROJECT-TIMESTAMP.json \
FILES_BACKUP_DIR=backups/files/documents-TIMESTAMP \
npm run restore
```

## Restore Firestore from Google Drive

```text
Google Drive
→ download backup
→ restore Firestore
```

```bash
# PowerShell
$env:CONFIRM_RESTORE="YES"
$env:GOOGLE_DRIVE_BACKUP_FILE_ID="drive-file-id"
npm run restore
```

```bash
# bash
CONFIRM_RESTORE=YES \
GOOGLE_DRIVE_BACKUP_KEY=backups/2026-09-14/PROJECT-TIMESTAMP.json \
npm run restore
```

The script downloads the object to `backups/restore-tmp/` and writes the JSON collections back to Firestore. It never exposes restore through the mobile API.

## Restore documents

```text
Google Drive
→ retrieve document
→ authenticated access
```

When Google Drive is configured, employee files already live in the Drive documents folder. After a Firestore restore, open documents through:

`GET /documents/:id/file`

Do not make Drive files public. Local fallback files can still be restored with `FILES_BACKUP_DIR` if they were copied by `npm run backup:files`.

## After restore

1. `GET /health` must return `database: connected`
2. Sign in as Boss/Admin
3. Open one employee, one document, one invoice, and one payroll record

## Rollback after a bad deploy

1. Stop the API
2. Restore the JSON dump taken immediately before the deploy (local file or Google Drive)
3. Restore local document files only if the deploy did not touch Drive document files
4. Deploy the previous API build
5. Verify `/health` and a smoke login
