# Verify — Smart Meter Technician Training Certificate Registry

**Status:** Full-stack implementation, intended for a company demonstration. Independent repository from EDN Light.

Verify gives an authorized training organization controlled candidate entry, independent approval, cryptographically unpredictable certificate IDs, printable QR/PDF certificates, a public status page, revocation/suspension, audit events and API-based verification for EDN Light or other approved clients.

> Training completion is **not** NEMSA competency certification or a licence for electrical work. The default configuration permanently flags new certificates as **DEMO**. Do not set `ISSUER_APPROVED=true` until the actual issuing organization has authorized the program and certificate wording.

## Technology
- Next.js 15, TypeScript, React 19, server actions and Node.js route handlers.
- PostgreSQL hosted on free-tier Supabase during the demo.
- Password-hashed staff authentication, HttpOnly database-backed sessions and rate limiting.
- PDF-Lib and QR code generation; optional SMTP for holder possession challenges.
- Netlify Free is the recommended no-credit-card host for this company demonstration. Vercel Hobby is limited to personal, non-commercial use. Render may require a payment method even for its Free service.

## Quick start

1. Create a **Supabase Free** project; obtain a PostgreSQL connection string (use the Supabase connection pooler if deploying to Vercel).
2. Clone the repo, run `npm install`, copy `.env.example` to `.env.local` and supply `DATABASE_URL`, `SECURITY_PEPPER` (32+ random characters), `NEXT_PUBLIC_BASE_URL`, and `ISSUER_NAME`.
3. Apply `db/schema.sql` to your database via Supabase SQL Editor, or export `DATABASE_URL` and run `npm run db:migrate`.
4. Set `BOOTSTRAP_EMAIL` and a strong 14+ character `BOOTSTRAP_PASSWORD` **locally** and run `npm run db:bootstrap`. It works **only once**, when there are no staff accounts.
5. Remove bootstrap secrets. Start `npm run dev` and sign in at `/login`.
6. Under **Programs**, add the course. Under **Team**, create a distinct approver account.
7. Submit a successful candidate using the data-entry account. Sign in as a **different approver** to approve and issue a certificate.
8. Visit `/verify/<id>` or download the PDF. View the audit and try suspension/revocation.
9. Under **API clients**, create the EDN Light server-to-server key. Copy it immediately and keep it secret.
10. Configure SMTP to enable the optional certificate holder email challenge. Without SMTP, the integration can check certificate status but **cannot confirm holder ownership or automatically mark a professional fully verified**.

Start with [Netlify Free Deployment](docs/NETLIFY.md) (recommended; no credit card), or [Render Deployment](docs/DEPLOYMENT.md). See also [API Contract](docs/API.md) and [Security and Acceptance](docs/SECURITY.md).

## Roles
- `admin`: manage staff, API clients, programs, candidates, and approvals.
- `data_entry`: record candidates and import CSVs; cannot approve.
- `approver`: approve or reject candidates, issue certificates, suspend/revoke credentials.
- `auditor`: read-only visibility.

All roles follow the **maker-checker** rule: the same staff member cannot submit and approve an enrollment.

## API
- `GET /api/health`
- `GET /api/v1/public/certificates/:id`
- `POST /api/v1/integrations/certificates/verify`
- `POST /api/v1/integrations/claims/start`
- `POST /api/v1/integrations/claims/complete`
- `POST /api/v1/integrations/claims/status`

Integration requests use `Authorization: Bearer vfy_test_...` or `vfy_live_...`; the client key is stored as a SHA-256 digest. **Never use an API key in web or mobile frontend code.**

## Commands

```bash
npm install
npm run dev
npm run test
npm run lint
npm run build
npm run db:migrate
npm run db:bootstrap
```

## Repository relationship
Standalone issuer-owned registry lives here. The consumer is `Energy-Data-Network/EDN-Light`, with an existing Fastify service and professional onboarding/credential subsystem. **No EDN Light production code has been modified by this repository.** Integrate using a server-only adapter after testing and organizational approval.

## Limits / deployment prerequisites
The application code is committed, but running it requires an actual database, secrets, SMTP for holder claims, and deployment credentials. There is **no live public deployment** merely from pushing this repository.
