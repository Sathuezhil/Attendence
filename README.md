# Employee Management & Attendance App

Mobile app for **admin** and **employees**. The phone talks to **Firestore** and **Google Drive** directly. There is no Nest server to host.

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

Set `EXPO_PUBLIC_FIREBASE_*` and `EXPO_PUBLIC_GOOGLE_DRIVE_*` in `mobile/.env`. Enable Email/Password in Firebase Auth and **publish `firestore.rules`** (Firebase Console → Firestore → Rules). First time: **Create admin account**.

## 2. Employee login

1. Employee opens the app, taps **Employee**, then **Create employee login**.
2. They enter first name, last name, email and password. Admin does **not** need to add them first.
3. After login they fill the rest of their details and can **scan Emirates ID** or **upload a PDF**.
4. That person and file appear automatically under **Employees** in the admin login.

Admin can still add or edit employees later (salary, status, and so on).

## 3. Android APK

```bash
cd mobile
npx eas-cli build --platform android --profile preview
```

Put the same `EXPO_PUBLIC_*` values in EAS secrets.

## 4. Backups

```bash
cd scripts
npm install
npm run backup
```

See `docs/BACKUP.md`.
