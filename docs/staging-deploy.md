# Staging Deploy Pipeline

HurkME includes an automated staging deploy workflow:
- Workflow file: `.github/workflows/staging-deploy.yml`
- Trigger: every successful `CI` run on `main`

## Required secrets
Set these in GitHub repo settings (`Settings` -> `Secrets and variables` -> `Actions`):

- `STAGING_API_DEPLOY_HOOK_URL`
- `STAGING_WEB_DEPLOY_HOOK_URL`

These are provider-specific deploy webhook URLs (Render/Railway/Fly/etc.).

## Optional health checks

- `STAGING_API_HEALTHCHECK_URL`
- `STAGING_WEB_HEALTHCHECK_URL`

If set, the workflow will ping them after deploy and fail if the endpoint is not healthy.

## Recommended setup

1. Create a `staging` environment in GitHub.
2. Put deploy secrets in that environment or repo secrets.
3. Restrict environment access to maintainers.
4. Add notifications (Slack/email) on failed staging deploy runs.
