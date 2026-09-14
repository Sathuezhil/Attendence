# Employee Management & Attendance App

Boss/admin-only mobile application for managing employees, attendance, documents, visas, passports, and monthly invoices. Employees do not log in in this version.

The **phone app talks to Firestore and Google Drive directly**. You do **not** need to host Nest, Railway, Render, or Postgres.

```text
/
  mobile/    Expo app → Firebase Auth + Firestore + Google Drive
  backend/   optional Nest tools (not required to run the app)
```

## Prerequisites

- Node.js 20+
- npm
- Firebase project **Employee Management** (`employee-management-23186`) with Firestore
- Expo Go, or an APK from EAS

## 1. Install the app

```bash
cd mobile
npm install
copy .env.example .env
```

On macOS or Linux use `cp .env.example .env`.

## 2. Firebase Auth + Web API key

1. Firebase Console → Authentication → Sign-in method → enable **Email/Password**.
2. Project settings → Your apps → add a **Web** app (if you do not have one).
3. Copy the Web `apiKey` (and optionally `appId` / `messagingSenderId`) into `mobile/.env`:

```text
EXPO_PUBLIC_FIREBASE_API_KEY=your-web-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=employee-management-23186.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=employee-management-23186
```

4. Firestore → Rules. Publish the rules from `firestore.rules` (signed-in admin can read/write). Or paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 3. Google Drive files

Copy the same Drive values you already use into `mobile/.env` as `EXPO_PUBLIC_GOOGLE_DRIVE_*`. These stay on the private boss APK only — do not commit them.

Passport / visa / document **files** stay in Drive. Text records stay in Firestore.

## 4. Run the mobile app (no backend)

```bash
cd mobile
npm start
```

Then press `a` for Android, `i` for iOS Simulator (macOS only), or scan the QR code with **Expo Go**.

First time: use **Create account** on the login screen (one admin). After that, sign in with Email/Password. Old Nest passwords do not work — register once with the same email.

## 5. Android APK

```bash
cd mobile
npx eas-cli build --platform android --profile preview
```

Set the same `EXPO_PUBLIC_*` values in EAS secrets / env before building. There is no API URL.

## 6. Optional Nest backend

`backend/` still exists if you want REST locally. The mobile app no longer calls it.

## Architecture notes

- Admin-only. Login uses Firebase Auth email/password. One admin account.
- Employees, attendance, leave, payroll, invoices, settings, and notifications live in Firestore.
- Passport, visa, and document files stay in private Google Drive. Firestore stores the Drive file id / storage key.
- Attendance defaults to `MANUAL`.
- Document expiry is calculated in the app (warning / urgent / expired).
- Reports export as CSV (or HTML for payslip / invoice).

## Useful commands

| Task | Command |
| --- | --- |
| Install mobile | `cd mobile && npm install` |
| Start mobile | `cd mobile && npm start` |
| Typecheck | `cd mobile && npm run typecheck` |
| Android APK | `cd mobile && npx eas-cli build --platform android --profile preview` |
