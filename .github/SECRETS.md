# GitHub Actions Secrets

Authoritative list of secrets consumed by `.github/workflows/`. Set each in
**Settings → Environments** (`staging`, `production`) or as a **Repository secret**
for items used by both.

If any required secret is missing, the corresponding job emits a warning and
**skips** (staging) or **errors** (production). This prevents red CI on a fresh
clone while still enforcing prod safety.

## Repository-level

| Name                    | Used by                                       | Notes                                                                              |
| ----------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| `EXPO_TOKEN`            | `submit-mobile-production`                    | EAS CLI token. Generate at <https://expo.dev/accounts/.../settings/access-tokens>. |
| `VERCEL_TOKEN`          | `deploy-web-staging`, `deploy-web-production` | Vercel CLI token. Repo-level OK since the org/project IDs scope it.                |
| `VERCEL_ORG_ID`         | `deploy-web-*`                                | Vercel org id (`team_…`).                                                          |
| `VERCEL_PROJECT_ID_WEB` | `deploy-web-*`                                | Vercel project id for `apps/web`.                                                  |

## Environment: `staging`

| Name                         | Used by              | Notes                                                    |
| ---------------------------- | -------------------- | -------------------------------------------------------- |
| `STAGING_DATABASE_URL`       | `migrate-staging`    | Pooled Neon connection string (Prisma uses for runtime). |
| `STAGING_DIRECT_URL`         | `migrate-staging`    | Direct Neon connection (Prisma uses for migrations).     |
| `RENDER_STAGING_DEPLOY_HOOK` | `deploy-api-staging` | Render deploy webhook URL.                               |

## Environment: `production`

| Name                      | Used by                 | Notes                               |
| ------------------------- | ----------------------- | ----------------------------------- |
| `PROD_DATABASE_URL`       | `migrate-production`    | Pooled Neon prod connection string. |
| `PROD_DIRECT_URL`         | `migrate-production`    | Direct Neon prod connection string. |
| `RENDER_PROD_DEPLOY_HOOK` | `deploy-api-production` | Render prod deploy webhook URL.     |

## Verifying

After setting a secret, dispatch the workflow manually:

```sh
gh workflow run deploy.yml -f target=staging
gh run watch
```

A staging run with all secrets set should complete green end-to-end. With
secrets missing, jobs should print a `::warning::` and complete successfully.

## Rotation

- **Vercel/Expo tokens**: rotate every 90 days. Revoke immediately on suspected
  compromise.
- **Render deploy hooks**: regenerate in the Render dashboard and update here.
- **DB URLs**: rotate via Neon `Reset password` and update `STAGING_DATABASE_URL`
  / `PROD_DATABASE_URL`. Coordinate with on-call.
