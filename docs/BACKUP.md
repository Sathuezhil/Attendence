# Backup and restore

These scripts run on your PC. There is **no** mobile restore button.

## What is backed up

- Firestore collections (JSON export) via `npm run backup`
- Employee files already live in Google Drive; `npm run backup:files` only records that
- Backup attempts are stored in Firestore `backup_logs`

## Configure

Copy `scripts/.env.example` to `scripts/.env` and set:

```text
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REFRESH_TOKEN=
GOOGLE_DRIVE_FOLDER_ID=
```

Use the Firebase **service account** (not the Web API key). Drive values are the same as the app uses for documents.

## Daily backup

```bash
cd scripts
npm install
npm run backup
npm run backup:files
```

`npm run backup` exports Firestore to a local JSON file, then uploads it to Drive `backups/<date>/`. Retention default is 7 days (`BACKUP_RETENTION_DAYS`).

Schedule with Windows Task Scheduler or cron:

```text
0 2 * * * cd /path/to/Attendence/scripts && npm run backup && npm run backup:files
```

## Restore Firestore

This overwrites live data. Operator confirmation is required.

```bash
cd scripts
# PowerShell
$env:CONFIRM_RESTORE="YES"
$env:BACKUP_FILE="backups/database/PROJECT-TIMESTAMP.json"
npm run restore
```

From Google Drive:

```bash
$env:CONFIRM_RESTORE="YES"
$env:GOOGLE_DRIVE_BACKUP_FILE_ID="drive-file-id"
npm run restore
```

After restore, sign in on the app and open one employee, document, invoice, and payroll record. Document bytes stay in Drive.
