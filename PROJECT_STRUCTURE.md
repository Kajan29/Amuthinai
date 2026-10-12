# Amuthinai — Folder Structure

```
Amutinai/
├── .github/
│   └── workflows/              CI pipeline
│
├── backend/                    BACKEND — NestJS + MongoDB API
│   ├── test/                   End-to-end tests
│   └── src/
│       ├── common/             Shared code
│       │   ├── decorators/
│       │   ├── dto/
│       │   ├── enums/
│       │   ├── filters/
│       │   ├── guards/
│       │   ├── interceptors/
│       │   ├── schemas/
│       │   └── utils/
│       ├── config/             Environment & database config
│       ├── database/           Seed script
│       └── modules/            Feature modules
│           ├── analytics/
│           ├── assignments/
│           ├── auth/
│           ├── chat/
│           ├── delivery-proof/
│           ├── donations/
│           ├── donor-dashboard/
│           ├── email/
│           ├── enquiries/
│           ├── food-requests/
│           ├── ngos/
│           ├── notifications/
│           ├── points/
│           ├── scheduler/
│           ├── status-history/
│           ├── uploads/
│           └── users/
│
├── docs/                       Documentation
│   ├── api/
│   ├── diagrams/
│   ├── milestones/
│   └── srs/
│
└── mobile/                     FRONTEND — Expo React Native app
    ├── assets/                 Images, icons, fonts
    ├── scripts/                Dev helper scripts
    ├── app/                    Screens (Expo Router)
    │   ├── (auth)/             Login & register
    │   ├── (donor)/            Donor screens
    │   ├── (volunteer)/        Volunteer screens
    │   ├── (recipient)/        Recipient screens
    │   └── (admin)/            Admin screens
    └── src/
        ├── api/                Backend API calls
        ├── components/         Reusable UI components
        ├── constants/
        ├── hooks/
        ├── i18n/               English / Tamil / Sinhala
        ├── services/           Storage, notifications, maps, uploads
        ├── shims/
        ├── store/              Zustand state
        ├── theme/              Colors, fonts, spacing
        ├── types/
        └── utils/
```
