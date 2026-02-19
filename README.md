# HurkME MVP

HurkME is a legit creator growth + creator discovery + paid jobs platform.

## Compliance rules in this MVP
- No automation of likes/follows/comments on Instagram, TikTok, X, YouTube, or LinkedIn.
- No follower boosting or engagement pod behavior.
- Daily guidance is recommendation-only.
- Paid Jobs payouts are performance-based and tied to proof + review.

## Monorepo structure
```text
hurkme/
  apps/
    api/        # NestJS API + Prisma + BullMQ workers
    web/        # Next.js UI + Tailwind + Clerk integration
  packages/
    shared/     # Shared domain helpers (tier logic, constants)
  docker-compose.yml
  README.md
```

## Stack
- Web: Next.js (App Router), TypeScript, Tailwind
- API: NestJS, TypeScript
- DB: PostgreSQL + Prisma migrations
- Cache/Queue: Redis + BullMQ
- Search: Meilisearch
- Auth: Clerk (with local dev bypass mode)
- Storage: S3-compatible presigned upload flow
- Monitoring: Sentry placeholder

## Quick start
### Fastest path (recommended)
```bash
npm run local:doctor
npm run local:up
```

This command:
- starts Docker services
- creates missing env files
- runs migrations + seed
- starts API + web + worker in `stable` mode (build + run)
- prints the URLs to open

Use these helpers:
```bash
npm run local:status
npm run local:down
npm run local:down:infra
npm run local:up:dev
```

Modes:
- `npm run local:up`: reliable mode, fewer startup hiccups.
- `npm run local:up:dev`: watch mode for active coding.

### Manual path
1. Start infra:
```bash
docker compose up -d
```

2. Install deps:
```bash
npm install
```

3. Copy env files:
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

4. Keep API boot fast in local dev (recommended):
```bash
# in apps/api/.env
PRISMA_BOOTSTRAP_CONNECT=false
```

5. Run migrations + seed:
```bash
npm --workspace @hurkme/api run prisma:generate
npm --workspace @hurkme/api run migrate:deploy
npm --workspace @hurkme/api run seed
```

6. Start apps:
```bash
npm run dev
```

7. Start worker (second terminal):
```bash
npm run dev:worker
```

## Localhost troubleshooting
If localhost is not loading:
1. Check service status:
```bash
npm run local:status
```
2. Restart all local services:
```bash
npm run local:down
npm run local:up
```
3. Open the exact URLs:
- `http://localhost:3000/home`
- `http://localhost:4000/docs`
4. If terminal says `npm: command not found` or `docker: command not found`, reopen terminal and ensure your PATH includes:
- `/usr/local/bin`
- `/opt/homebrew/bin` (Apple Silicon)
5. If first web load is slow in dev mode, this is normal on first compile. Use `npm run local:up` for stable mode to avoid this.

## Local auth modes
### Demo mode (default in examples)
- `apps/api/.env`: `AUTH_BYPASS=true`
- `apps/web/.env.local`: `NEXT_PUBLIC_AUTH_BYPASS=true`
- Sign in via `/sign-in` demo selector.

Seeded auth provider IDs:
- `demo_creator_1`
- `demo_creator_2`
- `demo_creator_3`
- `demo_admin_1` (admin routes)

### Clerk mode
- Set Clerk keys in both app env files.
- Set `AUTH_BYPASS=false` and `NEXT_PUBLIC_AUTH_BYPASS=false`.
- Backend verifies bearer tokens using Clerk secret key.

## API docs
- Swagger OpenAPI: `http://localhost:4000/docs`

## Core endpoints implemented
- `GET /me`
- `GET /health`
- `POST /profile/onboarding`
- `PATCH /profile`
- `GET /creators/:id`
- `GET /profile/saved-creators`
- `GET /feed`
- `GET /creators/search`
- `POST /interactions`
- `GET /daily-steps/today`
- `POST /daily-steps/:id/complete`
- `GET /streaks`
- `GET /campaigns`
- `GET /campaigns/:id`
- `POST /campaigns/:id/apply`
- `POST /campaigns/:id/submit`
- `POST /uploads/presign`
- `GET /wallet`
- `GET /payouts`
- `GET /admin/campaigns`
- `POST /admin/campaigns`
- `POST /admin/campaigns/:id/invite`
- `GET /admin/submissions`
- `POST /admin/submissions/:id/review`
- `POST /admin/campaigns/:id/compute-payouts`
- `GET /admin/campaigns/:id/payout-report`
- `GET /admin/audit-logs`

## Jobs and scheduling
- Daily Steps assignment queue: every day at 6am server time.
- Match refresh queue: nightly at 2am server time.
- Daily Steps cleanup queue: nightly (marks stale assigned steps as skipped).
- Active feed refresh queue: every 2 hours for recently active creators.
- Campaign auto-close queue: every 30 minutes for expired campaigns.
- On onboarding/profile update: enqueue per-user match refresh + feed refresh.

## Payout model implemented
- Platform fee = `budget_total * platform_fee_pct`
- Payout pool = `budget_total - platform_fee`
- `BASE_BONUS`: base pool = 20% split equally, bonus pool = 80% by adjusted performance.
- `PERFORMANCE_ONLY`: 100% by adjusted performance.
- Performance score uses normalized views/likes/comments/engagement weights.
- If comments are not used, comment weight is redistributed to views/likes.
- Adjusted score = performance score × authenticity score.

## Anti-fraud heuristics (MVP)
- Flags extreme like/view ratio vs campaign median.
- Flags suspicious early high-view submissions.
- Flags repeated identical proof patterns.
- Applies authenticity score reductions (`1.0`, `0.7`, `0.4`).

## Tests
Run API unit tests:
```bash
npm --workspace @hurkme/api run test
```

Included tests:
- follower tier classification boundaries
- payout distribution math
- admin review and payout endpoint integration checks (`test:integration`)
- core flow e2e (`onboarding -> apply -> submit proof -> admin review -> payout`)

Optional:
```bash
npm --workspace @hurkme/api run test:jest
npm --workspace @hurkme/api run test:integration
npm --workspace @hurkme/api run test:e2e
npm --workspace @hurkme/web run build
```

## CI
- GitHub Actions workflow: `.github/workflows/ci.yml`
- Runs on push/PR:
  - API deterministic tests (`test:fast`)
  - API admin integration tests (`test:integration`)
  - API core flow e2e (`test:e2e`)
  - Web production build

## Staging deploy
- GitHub Actions workflow: `.github/workflows/staging-deploy.yml`
- Trigger: after successful `CI` run on `main`
- Required repository secrets:
  - `STAGING_API_DEPLOY_HOOK_URL`
  - `STAGING_WEB_DEPLOY_HOOK_URL`
- Optional healthcheck secrets:
  - `STAGING_API_HEALTHCHECK_URL`
  - `STAGING_WEB_HEALTHCHECK_URL`

## Branch protection
- Recommended policy and setup guide: `docs/branch-protection.md`
- Quick apply (GitHub CLI):
```bash
./scripts/set-branch-protection.sh <owner/repo> main "CI / test-and-build"
```

## Important notes
- This MVP is intentionally manual-first for verification and payout operations.
- No social platform bot automation is included.
- Admin payout processing remains manual while calculation and reporting are structured for future automation.
