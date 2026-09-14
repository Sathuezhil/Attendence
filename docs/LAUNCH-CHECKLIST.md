# Launch and QA checklist

Use PASS / FAIL / BLOCKED. Fix FAIL items. Use BLOCKED only for missing external configuration.

## Smoke test (real database)

- [ ] Login
- [ ] Dashboard
- [ ] Employees
- [ ] Employee profile tabs (profile, attendance, leave, documents, payroll, activity)
- [ ] Attendance check-in / check-out
- [ ] Leave approve / reject
- [ ] Documents upload / expiry
- [ ] Payroll create / mark paid
- [ ] Invoice create / mark paid
- [ ] Reports + PDF/CSV/Excel export
- [ ] Notifications badge, read, delete
- [ ] Settings save (working hours, leave limits, payroll days)
- [ ] Profile edit
- [ ] Change password then re-login
- [ ] Logout

## Section 25 audit (2026-09-14)

| Area | Result | Notes |
| --- | --- | --- |
| JWT auth + expiry | PASS | Access JWT, hashed refresh tokens, SecureStore |
| Password hashing | PASS | bcrypt 12; change-password revokes sessions |
| Login brute-force | PASS | 5 attempts / 15 minutes |
| Authorization | PASS | Global JWT guard; Boss/Admin only |
| CORS / headers | PASS | Production rejects `*`; security headers set |
| Safe errors | PASS | No stack traces in production responses |
| File upload | PASS | MIME from bytes, size limit, safe names |
| Settings affect calculations | PASS | Hours, leave limits, payroll days/overtime, expiry, notification toggles |
| Employee profile | PASS | Tabs reuse existing APIs |
| Notifications | PASS | Types + inbox + mobile read/delete |
| Backup/restore | PASS | Server CLI only; no public restore API |
| TypeScript backend | PASS | `npx tsc --noEmit` |
| TypeScript mobile | PASS | `npx tsc --noEmit` |
| ESLint backend | PASS | `npx eslint "{src,apps,libs,test}/**/*.ts"` |
| Jest | PASS | 161 tests |
| Backend production build | PASS | `npm run build` |
| Prisma types (local) | PASS | `npx prisma generate` (enums only; runtime is Firestore) |
| Production API URL in code | PASS | Production builds require `EXPO_PUBLIC_API_URL` |
| EAS Android production binary | BLOCKED | Needs Expo login + real HTTPS `EXPO_PUBLIC_API_URL` |
| EAS iOS production binary | BLOCKED | Needs Apple Developer account + Expo login + HTTPS `EXPO_PUBLIC_API_URL` |
| Physical Android device test | BLOCKED | No device in this environment |
| Physical iPhone / Expo Go test | BLOCKED | Use Expo Go on a real iPhone on the same Wi-Fi; Windows cannot run the iOS Simulator |
| HTTPS reverse proxy | BLOCKED | Operator must terminate TLS in front of the API |
| Production Firestore | BLOCKED | Copy `.env.production.example` and set `FIREBASE_PROJECT_ID` plus a service account |
| Offsite encrypted backups | BLOCKED | Code supports Google Drive backups; live Drive upload has not been verified in this environment |
| Google Drive document storage | BLOCKED | Code supports Google Drive documents; live Drive upload has not been verified in this environment |

The application is **not** claimed production-ready until the BLOCKED operator items above are completed.

## Rollback

1. Take `npm run backup` and `npm run backup:files` before deploy
2. If launch fails, restore that snapshot and redeploy the previous backend/mobile builds
3. Confirm `GET /health` and admin login
