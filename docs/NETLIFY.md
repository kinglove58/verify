# Host Verify on Netlify Free (no credit card)

This document supersedes the Render-specific instructions in DEPLOYMENT.md for the company demo.

## Prerequisites
- GitHub: `kinglove58/verify` on `main`.
- Supabase Free project `verify` already created and schema migrated in Frankfurt (project ref `zswyjqtbwzeqxlqvmwdu`). Do not create another database.
- A Netlify Free account linked to GitHub. No payment card is needed for the Free plan.

## Deploy from GitHub
1. Open https://app.netlify.com and sign up/sign in with GitHub.
2. Select **Add new project** > **Import an existing project** > GitHub > **kinglove58/verify**.
3. Netlify detects Next.js. The committed `netlify.toml` runs `npm run build` with Node 22. The Netlify Next.js adapter automatically supports App Router, route handlers and Server Actions.
4. Under **Environment variables**, set these for production/server and builds:
   - `DATABASE_URL`: Copy the pooled PostgreSQL connection string from the existing Supabase project's **Connect** interface; insert the database password. Use the connection pooler and TLS. Never put the URI in a public GitHub file.
   - `SECURITY_PEPPER`: 32 or more cryptographically random characters, e.g. generate locally using `openssl rand -hex 32`; never commit it.
   - `ISSUER_NAME`: `Demonstration Training Organization` until real organization approval.
   - `ISSUER_APPROVED`: `false`.
   - `NEXT_PUBLIC_BASE_URL`: the final public site origin, such as `https://YOUR-SITE.netlify.app`; update this variable and redeploy once Netlify allocates the hostname.
   - Optional `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` for possession verification. Do not claim end-to-end holder confirmation works until configured and tested.
5. Deploy on Free. Confirm `/api/health` returns `{"status":"ok"}`. If unavailable, check the database URL and TLS settings in the Netlify function logs. Never display the database URL publicly.
6. Create the first admin in a trusted local shell with `DATABASE_URL`, `BOOTSTRAP_EMAIL` and `BOOTSTRAP_PASSWORD` (14+ characters) set, then execute `npm run db:bootstrap`. Clear the variables when finished. The bootstrap script refuses to run if an admin/staff already exists.
7. Sign in at `/login`, create a second approver, and verify that one staff member cannot approve their own enrolment.
8. Run the demonstration: candidate record → approve → QR/PDF certificate → public verification → suspension/revocation → API key. Use only fictional/demo candidates unless privacy permission and operational controls are in place.

## Costs and limits
At the time this guide was written, Netlify Free: $0/month, no card required, 300 credits/month with a hard limit. It supports commercial demos. Usage over the hard limit pauses the project rather than charging the card. Supabase Free can pause inactive projects, so rehearse and confirm the database is awake before presenting.

## Notes
A company demo does not authorize issuance of real credentials. Do not modify `ISSUER_APPROVED` until written approval and correct issuer name. A certificate status lookup never establishes holder ownership or NEMSA regulatory competence.
