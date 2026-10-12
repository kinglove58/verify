# Verify registry — Deno Deploy Free

## Why Deno Deploy
Deno Deploy's **new platform** at https://console.deno.com natively hosts Next.js applications with App Router / SSR / server functions, Node/npm compatibility, and integrated GitHub builds. Unlike static hosting, it can run Verify's authenticated Next.js API routes, staff login and PDF generator. Its Free plan is listed at $0/month; check the current account signup terms and billing controls before completing the account setup.

**Do not use** the discontinued classic dashboard `dash.deno.com`; Deploy Classic was sunset in July 2026.

## Existing resources
- GitHub: https://github.com/kinglove58/verify (branch `main`)
- Existing Supabase Free project: `verify`, reference `zswyjqtbwzeqxlqvmwdu`, region Frankfurt. The 12 registry tables have already been migrated and Row Level Security is enabled.
- All new certificates stay explicitly **demonstration records** until the training organization approves the issuer.

## Link the repo
1. Sign in to https://console.deno.com with GitHub and create a **Free** organization (if one is not already present).
2. Create **New App**, choose GitHub repository `kinglove58/verify`, branch `main`. If missing, grant the Deno Deploy GitHub App access to that repository. You do not need to copy project source.
3. Let Deno autodetect **Next.js**. Deno Deploy uses the standalone Next.js output. No static export; Next's server routes must remain enabled.
4. Choose Europe deployment region if the UI permits (the Supabase database is in Frankfurt).
5. Set production environment variables in the Deno Deploy app settings **without exposing the values in GitHub**:
   - `DATABASE_URL`: **pooled** PostgreSQL URI from Supabase > `verify` > Connect. Use the supplied connection details and database password. Prefer transaction/session pooler compatible with your runtime.
   - `SECURITY_PEPPER`: at least 32 characters generated securely, such as `openssl rand -hex 32`.
   - `ISSUER_NAME=Demonstration Training Organization`
   - `ISSUER_APPROVED=false`
   - `NEXT_PUBLIC_BASE_URL=https://<actual assigned Deno Deploy hostname>` (set once Deno gives the hostname, then redeploy).
   - Optional SMTP settings: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`. Email ownership challenges are unavailable without these.
6. Deploy the default branch. Inspect build and runtime logs if needed.
7. Test `https://<site>/api/health` (must return HTTP 200 and `{"status":"ok"}`), public home page, and `/verify`.
8. Initialize **one** admin from your own trusted shell by setting `DATABASE_URL`, `BOOTSTRAP_EMAIL`, and a 14+ character temporary `BOOTSTRAP_PASSWORD` and running `npm run db:bootstrap`. Never put bootstrap credentials in GitHub or Deno build variables. The bootstrap script refuses to run if any staff already exist. Clear temporary variables immediately.
9. Log in as the admin, change your password, create a separate approver, create training program(s), and test fictional candidates and certificate issuance.
10. Keep a documented acceptance test of PDF/QR code, masked public lookup, suspend/revoke lifecycle, audit trail, and partner API authentication. For email holder claims, verify SMTP sender before testing.

## Security and free-tier warnings
- Verify is a **server-rendered credential system**, not a static website. Do **not** run `next export` or `output:"export"`.
- The GitHub repo is currently public; do not commit real people, login credentials, connection strings, mail passwords, or API tokens.
- Supabase's tables have RLS enabled with **no anon/authenticated policies**. Server-side PostgreSQL connections handle database access; browser users never connect directly to the database.
- Don't mark demonstration certificates as real professional qualification or NEMSA authorization.
- Deno Deploy's Free plan has usage quotas, including monthly requests/bandwidth limits, and **even tighter limits before credit-card verification**. The official Deno changelog says Free organizations exceeding limits have their apps paused until the next billing cycle. Avoid adding a card if funds are an issue; do not select Pro. Reference: https://docs.deno.com/deploy/changelog/ (September 26, 2025).
- No environment secrets or admin account have been configured merely by adding this guide; a working deployed site requires the deployment steps above.

## Verification references
- https://docs.deno.com/deploy/getting_started/
- https://docs.deno.com/deploy/reference/frameworks/
- https://deno.com/deploy/pricing
- https://docs.deno.com/deploy/migration_guide/
