# Employee Management & Attendance App

Boss/admin-only mobile application for managing employees, attendance, documents, visas, passports, and monthly invoices. Employees do not log in in this version.

The current milestone includes the monorepo, database schema, backend health check, and boss/admin authentication.

```text
/
  backend/   NestJS + Prisma + PostgreSQL
  mobile/    Expo + React Native + TypeScript + Expo Router
```

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL 16+
- Docker Desktop (optional, recommended for local PostgreSQL)
- Expo Go on a phone, or Android Studio / Xcode for emulators

## 1. Install dependencies

```bash
cd backend
npm install
npx prisma generate

cd ../mobile
npm install
```

## 2. Configure environment variables

```bash
cd backend
copy .env.example .env
```

On macOS or Linux use `cp .env.example .env`.

Edit `backend/.env` and keep `DATABASE_URL` pointed at your PostgreSQL instance. JWT and object-storage values are placeholders for later auth and private file uploads. Do not commit real secrets.

Optional mobile override:

```bash
cd mobile
copy .env.example .env
```

If `EXPO_PUBLIC_API_URL` is empty, the app uses the Expo dev-machine host and port `3000`.

## 3. Run PostgreSQL

With Docker:

```bash
docker compose up -d postgres
```

Without Docker, create a local database that matches `.env`:

```text
database: employee_management
user:     postgres
password: postgres
port:     5432
```

```sql
CREATE DATABASE employee_management;
```

## 4. Run the database migration

```bash
cd backend
npx prisma migrate dev
```

On a server or CI environment use:

```bash
cd backend
npx prisma migrate deploy
```

## 5. Run the backend

```bash
cd backend
npm run start:dev
```

Health check: [http://localhost:3000/health](http://localhost:3000/health)

Expected response:

```json
{
  "status": "ok",
  "service": "employee-management-api",
  "timestamp": "2026-09-12T06:00:00.000Z",
  "database": "connected"
}
```

## 6. Run the mobile app

```bash
cd mobile
npm start
```

Then press `a` for Android, `i` for iOS, or scan the QR code with Expo Go.

The app opens on the admin login screen. After a successful login it navigates to a protected Dashboard placeholder.

## 7. Create the first boss/admin

`POST /auth/register` works only when no admin exists yet. Employees do not get accounts.

```bash
curl -X POST http://localhost:3000/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Boss\",\"email\":\"boss@company.com\",\"password\":\"ChangeThisPassword\"}"
```

On macOS or Linux:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Boss","email":"boss@company.com","password":"ChangeThisPassword"}'
```

Then sign in from the mobile app or:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"boss@company.com","password":"ChangeThisPassword"}'
```

Use the returned `accessToken` as `Authorization: Bearer <token>` for `GET /auth/me`, dashboard routes, and employee management.

## 8. Employee management

Employees are managed by the boss/admin. They do not have login accounts. All `/employees` routes require `Authorization: Bearer <accessToken>`.

```bash
curl -X POST http://localhost:3000/employees \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"employeeCode\":\"EMP-001\",\"firstName\":\"Ada\",\"lastName\":\"Lovelace\",\"email\":\"ada@company.com\",\"jobTitle\":\"Engineer\",\"department\":\"IT\",\"employmentStatus\":\"ACTIVE\"}"

curl "http://localhost:3000/employees?page=1&limit=20&search=Ada&department=IT&employmentStatus=ACTIVE" \
  -H "Authorization: Bearer <accessToken>"

curl http://localhost:3000/employees/<id> \
  -H "Authorization: Bearer <accessToken>"

curl -X PATCH http://localhost:3000/employees/<id> \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"jobTitle\":\"Lead Engineer\"}"

curl -X DELETE http://localhost:3000/employees/<id> \
  -H "Authorization: Bearer <accessToken>"
```

`DELETE /employees/:id` deactivates the employee (`employmentStatus=INACTIVE` and `deletedAt`) so attendance history is not destroyed. Soft-deleted employees are hidden from normal lists.

In the mobile app: Dashboard → Employees → Add / Details / Edit. Attendance, Leave, and Documents are available from the dashboard and from Employee Details.

## 9. Attendance

All `/attendance` routes require `Authorization: Bearer <accessToken>`. Records reference real employees. Absence is calculated dynamically for active employees with no row for the day.

Working hours defaults live in one place (`backend/src/attendance/working-hours.ts`) and can later be overridden with the `ATTENDANCE_HOURS` app setting:

- start `09:00`
- end `18:00`
- late threshold `15` minutes
- half-day `240` minutes

```bash
curl "http://localhost:3000/attendance/today" -H "Authorization: Bearer <accessToken>"

curl -X POST http://localhost:3000/attendance/check-in \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"employeeId\":\"<employee-id>\"}"

curl -X POST http://localhost:3000/attendance/<attendance-id>/check-out \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{}"

curl "http://localhost:3000/attendance?employeeId=<employee-id>&startDate=2026-09-01&endDate=2026-09-30" \
  -H "Authorization: Bearer <accessToken>"
```

`DELETE /attendance/:id` is rejected so historical attendance is not destroyed.

## 10. Leave

Boss/admin manages all leave. Employees do not have accounts. `totalDays` is calculated on the backend. Pending and approved leave cannot overlap for the same employee. Approved leave is shown as `ON_LEAVE` on the daily attendance board without creating one attendance row per leave day.

```bash
curl -X POST http://localhost:3000/leave \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"employeeId\":\"<employee-id>\",\"leaveType\":\"ANNUAL\",\"startDate\":\"2026-10-01\",\"endDate\":\"2026-10-05\"}"

curl "http://localhost:3000/leave?status=PENDING" -H "Authorization: Bearer <accessToken>"

curl -X POST http://localhost:3000/leave/<id>/approve \
  -H "Authorization: Bearer <accessToken>"

curl -X POST http://localhost:3000/leave/<id>/reject \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"rejectionReason\":\"Coverage is not available\"}"
```

## 11. Employee documents

Boss/admin manages employee documents. Employees do not have accounts. File bytes are stored in private local storage (`STORAGE_LOCAL_DIR`, default `storage/`). PostgreSQL stores metadata only. Document files are streamed through JWT-protected `GET /documents/:id/file` and are never given public URLs.

Expiry status is calculated dynamically as `VALID`, `EXPIRING_SOON`, or `EXPIRED` using a 30-day warning window from `DOCUMENT_EXPIRY_WARNING_DAYS` or the `DOCUMENT_EXPIRY_WARNING_DAYS` app setting.

```bash
curl -X POST http://localhost:3000/employees/<employee-id>/documents ^
  -H "Authorization: Bearer <accessToken>" ^
  -F "documentType=PASSPORT" ^
  -F "documentNumber=A1234567" ^
  -F "issueDate=2024-01-15" ^
  -F "expiryDate=2027-01-15" ^
  -F "file=@passport.pdf;type=application/pdf"

curl "http://localhost:3000/employees/<employee-id>/documents" -H "Authorization: Bearer <accessToken>"

curl "http://localhost:3000/documents?expired=true" -H "Authorization: Bearer <accessToken>"

curl http://localhost:3000/documents/<id> -H "Authorization: Bearer <accessToken>"

curl http://localhost:3000/documents/<id>/file -H "Authorization: Bearer <accessToken>" --output document.pdf

curl -X PATCH http://localhost:3000/documents/<id> ^
  -H "Authorization: Bearer <accessToken>" ^
  -H "Content-Type: application/json" ^
  -d "{\"notes\":\"Renewed\"}"

curl -X DELETE http://localhost:3000/documents/<id> -H "Authorization: Bearer <accessToken>"
```

Allowed uploads: PDF, JPG, JPEG, PNG. Size is limited by `MAX_UPLOAD_SIZE_BYTES` (default 10MB). List views mask sensitive document numbers.

Dashboard `GET /dashboard/summary` includes live `documentsExpired` and `documentsExpiringSoon` counts.

## 12. Document expiry notifications

In-app notifications are created from real document expiry dates. The daily job uses `DOCUMENT_EXPIRY_CRON` (default `0 7 * * *` UTC) and also runs once when the backend starts if `DOCUMENT_EXPIRY_CHECK_ON_BOOT=true`. Duplicate events are blocked by a unique `eventKey`.

Thresholds live in one place (`document-expiry.ts` + env/app settings):

- 30 days: `DOCUMENT_EXPIRING`
- 7 days: urgent `DOCUMENT_EXPIRING`
- on or after expiry: `DOCUMENT_EXPIRED`

```bash
curl "http://localhost:3000/notifications" -H "Authorization: Bearer <accessToken>"

curl "http://localhost:3000/notifications/unread-count" -H "Authorization: Bearer <accessToken>"

curl -X PATCH http://localhost:3000/notifications/<id>/read -H "Authorization: Bearer <accessToken>"

curl -X PATCH http://localhost:3000/notifications/read-all -H "Authorization: Bearer <accessToken>"

curl "http://localhost:3000/dashboard/expiry-alerts" -H "Authorization: Bearer <accessToken>"
```

Leave-approved, leave-rejected, and attendance-alert types exist for later modules. Push, SMS, WhatsApp, and email are not implemented.

## 13. Payroll

Boss/admin creates payroll from real employees and approved unpaid leave. Gross and net salary are calculated on the backend. `DELETE /payroll/:id` sets `CANCELLED` and does not hard-delete history.

```bash
curl -X POST http://localhost:3000/payroll \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"employeeId\":\"<employee-id>\",\"payrollMonth\":9,\"payrollYear\":2026,\"basicSalary\":2600,\"allowances\":200,\"overtimeAmount\":100,\"deductions\":50}"

curl "http://localhost:3000/payroll?year=2026&month=9" -H "Authorization: Bearer <accessToken>"

curl "http://localhost:3000/employees/<employee-id>/payroll" -H "Authorization: Bearer <accessToken>"

curl -X POST http://localhost:3000/payroll/<id>/mark-paid -H "Authorization: Bearer <accessToken>"
```

Unpaid leave deduction uses `basicSalary / PAYROLL_WORKING_DAYS_PER_MONTH` (default 26) times approved unpaid days in that month.

### Connecting from a physical device

1. Keep the backend listening on `0.0.0.0:3000` (already configured).
2. Put your computer and phone on the same network.
3. If auto-detection fails, set `EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3000` in `mobile/.env`.
4. Android emulator fallback is `http://10.0.2.2:3000`.
5. iOS simulator fallback is `http://localhost:3000`.

## Architecture notes

- Admin-only. JWT access/refresh tokens are issued on login. 2FA fields remain unused for now.
- Employee records are archived with `deletedAt` / `ARCHIVED` instead of hard delete.
- Passport, visa, document, and invoice files are stored in private object storage. PostgreSQL stores storage keys only. The current document module uses local disk under `STORAGE_LOCAL_DIR`.
- Attendance defaults to `MANUAL` and already has `source` values for future QR/GPS capture.
- Expiry reminder periods default to 90, 60, 30, and 7 days via `AppSetting`.
- Backups are tracked in `BackupLog`. A backup must not be marked `COMPLETED` unless the process actually finishes.
- Feature modules exist under `backend/src`. Health, authentication, the boss dashboard, employee management, attendance, leave, documents, in-app expiry notifications, and payroll are implemented. Employees do not have login accounts.

## Useful commands

| Task | Command |
| --- | --- |
| Install backend | `cd backend && npm install` |
| Install mobile | `cd mobile && npm install` |
| Start PostgreSQL | `docker compose up -d postgres` |
| Generate Prisma client | `cd backend && npx prisma generate` |
| Create/apply migration | `cd backend && npx prisma migrate dev` |
| Apply existing migrations | `cd backend && npx prisma migrate deploy` |
| Start backend | `cd backend && npm run start:dev` |
| Start mobile | `cd mobile && npm start` |
