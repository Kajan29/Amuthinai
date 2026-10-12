# Amuthinai

Surplus-food redistribution platform connecting **donors**, **volunteers**, **recipients** and
**admins**.

| Part     | Folder     | Stack                                                  |
| -------- | ---------- | ------------------------------------------------------ |
| Backend  | `backend/` | NestJS 11 · MongoDB (Mongoose) · JWT · Swagger         |
| Frontend | `mobile/`  | Expo 54 · React Native 0.81 · Expo Router · Zustand    |

Folder layout: [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md)

---

## Prerequisites

- **Node.js 22** (see `.nvmrc` — `nvm use`)
- **Docker** (for local MongoDB) — or a MongoDB Atlas URI
- **Expo Go** on your phone, or an Android emulator / iOS simulator

---

## Quick start

```bash
git clone https://github.com/Kajan29/Amuthinai.git && cd Amuthinai

# 1. Database — MongoDB :27017, mongo-express UI :8081
docker compose up -d

# 2. Backend — http://localhost:3000/api/v1  ·  Swagger: /api/docs
cd backend
cp .env.example .env
npm install
npm run seed          # optional: sample users & donations
npm run start:dev

# 3. Frontend — in a second terminal
cd mobile
cp .env.example .env
npm install
npx expo start --clear   # a = Android · i = iOS · w = web · or scan the QR
```

Backend and frontend are separate npm packages — there is no root `node_modules`.

---

## Environment

Only the values below must be changed to get running; everything else in `.env.example` has
a working default.

**`backend/.env`**

| Variable                           | Purpose                                              |
| ---------------------------------- | ---------------------------------------------------- |
| `MONGODB_URI`                      | Local Docker URI by default; replace with Atlas URI if needed |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | **Change before deploying**                          |
| `CLOUDINARY_*`                     | Image uploads                                        |
| `GOOGLE_CLIENT_ID`                 | Google sign-in (ID token verification)               |
| `SMTP_*`, `EMAIL_FROM`             | OTP / verification emails (Gmail needs an app password) |
| `CORS_ORIGINS`                     | Allowed web origins (Expo web runs on `:8081`)       |

**`mobile/.env`** — only `EXPO_PUBLIC_*` vars reach the app, so never put secrets here.

| Variable                               | Purpose                                         |
| -------------------------------------- | ----------------------------------------------- |
| `EXPO_PUBLIC_API_URL`                  | Backend URL — **use your LAN IP on a real phone** |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`     | Same value as backend `GOOGLE_CLIENT_ID`        |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`      | Maps (`pk.…` public token)                      |
| `EXPO_PUBLIC_CLOUDINARY_*`             | Client-side image uploads (unsigned preset)     |

> Changed `mobile/.env`? Restart with `npx expo start --clear` — Expo inlines env vars at bundle time.

---

## Scripts

| Backend (`backend/`)  |                              | Frontend (`mobile/`) |                               |
| --------------------- | ---------------------------- | -------------------- | ----------------------------- |
| `npm run start:dev`   | API with hot reload          | `npm start`          | Metro dev server              |
| `npm run build`       | Compile to `dist/`           | `npm run android`    | Open on Android               |
| `npm run start:prod`  | Run compiled build           | `npm run web`        | Open in browser               |
| `npm run seed`        | Load sample data             | `npm run build:apk`  | EAS preview APK               |
| `npm test`            | Unit tests                   | `npm run typecheck`  | TypeScript check              |
| `npm run test:e2e`    | End-to-end tests             | `npm run lint`       | ESLint                        |
| `npm run lint`        | ESLint                       | `npm test`           | Jest                          |

CI (`.github/workflows/ci.yml`) runs backend lint → build → test on every push to `main` and on PRs.

---

## Running on a physical phone

`localhost` on a phone points at the phone itself. Find your PC's IP (`ipconfig` on Windows)
and set:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.5:3000/api/v1
```

Phone and PC must be on the same Wi-Fi, and Windows Firewall must allow Node on port `3000`.

---

## Building an APK

```bash
npm i -g eas-cli && eas login
cd mobile
npm run build:apk     # EAS "preview" profile → installable APK
```

Build-time env vars for EAS live in `mobile/eas.json` (`preview` and `production` profiles),
not in `.env`.

---

## Troubleshooting

| Problem                                        | Fix                                                          |
| ---------------------------------------------- | ------------------------------------------------------------ |
| `querySrv ECONNREFUSED` with Atlas             | Keep `MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1` in `backend/.env` |
| App shows "Network Error" on phone             | Use LAN IP in `EXPO_PUBLIC_API_URL`, check firewall          |
| Env change not picked up in app                | `npx expo start --clear`                                     |
| OTP emails not arriving                        | Use a Gmail **app password** for `SMTP_PASSWORD`; check spam |
| Port `8081` already in use                     | mongo-express and Metro both use `8081` — run `npx expo start --port 8082` or `docker compose stop mongo-express` |
| Port `27017` already in use                    | Another MongoDB is running — stop it or reuse it             |

---

## Roles

| Role      | Screens                    | Does                                                  |
| --------- | -------------------------- | ----------------------------------------------------- |
| Donor     | `mobile/app/(donor)`       | Posts donations, tracks status, earns karma points    |
| Volunteer | `mobile/app/(volunteer)`   | Accepts tasks, proves pickup & delivery (photo + PIN) |
| Recipient | `mobile/app/(recipient)`   | Raises food requests, reports concerns                |
| Admin     | `mobile/app/(admin)`       | Approves, assigns, resolves disputes, views analytics |

Module-level details and the FR/NFR requirement map: [`backend/README.md`](backend/README.md) ·
[`mobile/README.md`](mobile/README.md)
