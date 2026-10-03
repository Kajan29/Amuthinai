# Amuthinai

Surplus-food redistribution platform connecting **donors**, **volunteers**, **recipients** and
**admins**, built as an Expo (React Native) mobile app backed by a NestJS + MongoDB API.

## Repository layout

```
amuthinai/
├── mobile/      React Native + Expo (Expo Router, TypeScript)
├── backend/     NestJS + MongoDB (Mongoose)
├── docs/        SRS, milestone reports, API documentation
├── docker-compose.yml   local MongoDB
└── .github/workflows/   CI
```

Each package is installed and versioned independently — there is no root `node_modules`.
See [`mobile/README.md`](mobile/README.md) and [`backend/README.md`](backend/README.md).

## Getting started

```bash
# 1. database
docker compose up -d

# 2. api  → http://localhost:3000/api/v1  (docs at /api/docs)
cd backend
cp .env.example .env
npm install
npm run start:dev

# 3. mobile app
cd ../mobile
cp .env.example .env
npm install
npm start
```

On a physical device set `EXPO_PUBLIC_API_URL` to your machine's LAN address
(e.g. `http://192.168.1.5:3000/api/v1`) — `localhost` resolves to the phone itself.

## Roles

| Role | Entry point | Core responsibilities |
| --- | --- | --- |
| Donor | `mobile/app/(donor)` | Post a donation, track its status, collect karma points |
| Volunteer | `mobile/app/(volunteer)` | Accept assignments, prove pickup and delivery |
| Recipient | `mobile/app/(recipient)` | Raise food requests, follow fulfilment, report concerns |
| Admin | `mobile/app/(admin)` | Approve donations and volunteers, assign, resolve disputes |

## Requirement traceability

Functional requirements from the SRS are referenced as `FR<n>` in code comments so a
requirement can be traced to its implementation.

| FR | Feature | Mobile | Backend |
| --- | --- | --- | --- |
| FR1 | Register, login, role selection | `app/(auth)` | `modules/auth` |
| FR2 | Post donation — food details | `app/(donor)/post-donation` | `modules/donations` |
| FR3 | Cooked time and safe-consumption window | `app/(donor)/post-donation` | `modules/donations`, `modules/scheduler` |
| FR4 | Admin review of donations | `app/(admin)/approvals` | `modules/donations` |
| FR5 | Recipient food request with map pin | `app/(recipient)/request` | `modules/food-requests` |
| FR6 | Match donation to request | `app/(admin)/assign` | `modules/assignments` |
| FR7 | Volunteer vehicle and travel radius | `app/(volunteer)/profile` | `modules/users`, `modules/assignments` |
| FR8 | Urgent task alerts and demand heat-map | `app/(volunteer)/dashboard` | `modules/notifications`, `modules/analytics` |
| FR9 | Delivery proof — photo, PIN, timestamp | `app/(volunteer)/pickup` | `modules/delivery-proof` |
| FR10 | Karma points | `app/(donor)/rewards` | `modules/points` |
| FR11 | NGO directory | — | `modules/ngos` |
| FR12 | Status timeline and concerns | `src/components/StatusTimeline.tsx` | `modules/status-history`, `modules/enquiries` |

Non-functional requirements referenced in code: `NFR3` offline cache, `NFR6` trilingual UI
(English / Tamil / Sinhala), `NFR7` tamper-evident status log.
