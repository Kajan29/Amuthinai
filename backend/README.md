# Amuthinai — backend

NestJS REST API over MongoDB. Every route is prefixed with `/api/v1`; Swagger UI is served
at `/api/docs` in development.

```bash
cp .env.example .env
npm install
npm run start:dev
```

MongoDB is expected at `MONGODB_URI`. `docker compose up -d` in the repository root starts
one locally.

## Layout

```
src/
├── main.ts          bootstrap: global pipes, filters, CORS, Swagger
├── app.module.ts    wires config, database, scheduler and every feature module
├── common/          cross-cutting code with no feature knowledge
│   ├── decorators/  @Roles(), @CurrentUser(), @Public()
│   ├── guards/      JwtAuthGuard (global), RolesGuard
│   ├── filters/     exception → JSON error shape the mobile client expects
│   ├── interceptors/ request logging
│   ├── enums/       Role, DonationStatus, FoodType, VehicleType
│   └── utils/       freshness window, geo distance
├── config/          env schema validation and typed config factories
├── database/        seed script
└── modules/         one folder per bounded context
```

Each feature module follows the same shape:

```
<feature>/
├── <feature>.module.ts
├── <feature>.controller.ts
├── <feature>.service.ts
├── dto/
└── schemas/
```

Controllers validate and delegate, services hold the rules, schemas own persistence.
Modules never reach into another module's schema — they inject the owning service.

## Authentication

`JwtAuthGuard` is registered globally, so routes are authenticated by default. Opt out with
`@Public()` (login, register) and restrict by role with `@Roles(Role.Admin)`.

## Requirement map

| Module | Requirements |
| --- | --- |
| `auth` | FR1 — register, login, role selection |
| `users` | FR7 — volunteer vehicle and travel radius, admin verification |
| `donations` | FR2, FR3, FR4 — posting, freshness window, admin review |
| `food-requests` | FR5 — recipient requests with a map pin |
| `assignments` | FR6, FR7 — matching donations to volunteers |
| `delivery-proof` | FR9 — photo, timestamp, location, PIN |
| `status-history` | FR12, NFR7 — hash-chained append-only status log |
| `chat` | in-app communication log |
| `enquiries` | recipient concerns escalated to admins |
| `points` | FR10 — karma points |
| `ngos` | FR11 — NGO directory |
| `notifications` | FR8 — Expo push delivery |
| `analytics` | FR8 — KPIs and demand aggregation |
| `uploads` | image storage |
| `scheduler` | FR3 — cron that expires stale donations and raises alerts |
