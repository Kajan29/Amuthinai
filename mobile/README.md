# Amuthinai — mobile

Expo (React Native) client with file-based routing via Expo Router.

```bash
cp .env.example .env
npm install
npm start            # then press a / i / w, or scan the QR code
```

## Layout

```
app/        routes only — one folder per role group, no business logic
src/
  api/        axios client and one module per backend resource
  components/ shared presentational components (ui/ holds the primitives)
  hooks/      reusable stateful logic
  store/      zustand stores that survive navigation
  i18n/       English, Tamil and Sinhala translations (NFR6)
  services/   device-level concerns: notifications, secure storage, offline cache
  theme/      colors, typography, spacing
  types/      shared domain models, mirrored from the backend enums
  utils/      pure helpers (freshness window, date formatting)
  constants/  non-themed constants and config
```

`app/` is reserved for route files: a screen should read data through `src/api` and render
components from `src/components`, so that routes stay thin and testable.

Imports resolve `@/` to `src/`:

```ts
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
```

## Route groups

| Group         | Audience                                            |
| ------------- | --------------------------------------------------- |
| `(auth)`      | unauthenticated — login, register, role selection   |
| `(donor)`     | donors — post and track donations, rewards          |
| `(volunteer)` | volunteers — assignments, pickup and delivery proof |
| `(recipient)` | recipients — food requests, concerns                |
| `(admin)`     | admins — approvals, assignment, disputes, analytics |

`app/_layout.tsx` mounts the providers (react-query, i18n) and `app/index.tsx` redirects to
the group matching the signed-in user's role.
