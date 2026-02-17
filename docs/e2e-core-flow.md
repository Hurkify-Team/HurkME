# Core Flow E2E

E2E script location:
- `apps/api/test/core-flow.e2e.ts`

It validates this sequence:
1. Creator onboarding update
2. Creator applies to a paid job
3. Creator submits proof links/screenshots
4. Admin reviews submission (approve)
5. Admin computes payouts
6. Creator sees payout record

## Run locally

1. Start infrastructure:

```bash
docker compose up -d
```

2. Prepare database:

```bash
npm --workspace @hurkme/api run prisma:generate
npm --workspace @hurkme/api run migrate:deploy
npm --workspace @hurkme/api run seed
```

3. Start API (AUTH_BYPASS true):

```bash
npm --workspace @hurkme/api run build
node apps/api/dist/main.js
```

4. Run e2e:

```bash
npm --workspace @hurkme/api run test:e2e
```

If your API is on a different URL:

```bash
E2E_API_URL=http://localhost:4000 npm --workspace @hurkme/api run test:e2e
```
