# Employee Management & Attendance App

Boss/admin-only mobile app. Employees do not log in.

The phone talks to **Firestore** and **Google Drive** directly. There is no Nest server to host.

```text
/
  mobile/     Expo app
  scripts/    Firestore + Drive backups (PC only)
  firestore.rules
```

## 1. Install and run the app

```bash
cd mobile
npm install
copy .env.example .env
npm start
```

Set `EXPO_PUBLIC_FIREBASE_*` and `EXPO_PUBLIC_GOOGLE_DRIVE_*` in `mobile/.env`. Enable Email/Password in Firebase Auth and publish `firestore.rules`. First time: **Create admin account**.

## 2. Android APK

```bash
cd mobile
npx eas-cli build --platform android --profile preview
```

Put the same `EXPO_PUBLIC_*` values in EAS secrets.

## 3. Backups

```bash
cd scripts
npm install
npm run backup
```

See `docs/BACKUP.md`.
