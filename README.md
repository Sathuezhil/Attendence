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

In the mobile app: Dashboard → Employees → Add / Details / Edit. Attendance is available from the dashboard and from Employee Details. Leave and Documents remain Coming Soon.

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

### Connecting from a physical device

1. Keep the backend listening on `0.0.0.0:3000` (already configured).
2. Put your computer and phone on the same network.
3. If auto-detection fails, set `EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3000` in `mobile/.env`.
4. Android emulator fallback is `http://10.0.2.2:3000`.
5. iOS simulator fallback is `http://localhost:3000`.

## Architecture notes

- Admin-only. JWT access/refresh tokens are issued on login. 2FA fields remain unused for now.
- Employee records are archived with `deletedAt` / `ARCHIVED` instead of hard delete.
- Passport, visa, document, and invoice files will be stored in private object storage. PostgreSQL stores storage keys only.
- Attendance defaults to `MANUAL` and already has `source` values for future QR/GPS capture.
- Expiry reminder periods default to 90, 60, 30, and 7 days via `AppSetting`.
- Backups are tracked in `BackupLog`. A backup must not be marked `COMPLETED` unless the process actually finishes.
- Feature modules exist under `backend/src`. Health, authentication, the boss dashboard, employee management, and attendance are implemented. Employees do not have login accounts.

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
