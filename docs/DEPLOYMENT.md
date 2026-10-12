# Free-tier demonstration and deployment

## Goal
Demonstrate the complete training-to-certificate-to-verification workflow to the company without purchasing Pro plans or representing demo records as real licensed credentials.

## Supabase Free (PostgreSQL)
1. Create a project in your own Supabase account (use a dedicated organization).
2. Set a strong project database password. Select a suitable nearby region.
3. Open SQL Editor and run `db/schema.sql`.
4. Copy the pooled PostgreSQL connection string to `DATABASE_URL` for Vercel/serverless.
5. Never expose the database URL or service credentials to the browser or GitHub.
6. Enable database backups when available and plan external backups; free-tier retention and pausing rules may change.

## Recommended: Render Free web service + Supabase Free
1. Create a Render Web Service and connect GitHub repository `kinglove58/verify` (or deploy from the included `render.yaml`).
2. Runtime: **Node**, Plan: **Free**, build command: `npm install --no-audit --no-fund && npm run build`, start command: `npm run start`.
3. Add environment variables from `.env.example`, using real values for `DATABASE_URL` (Supabase pooler URL), `SECURITY_PEPPER`, `NEXT_PUBLIC_BASE_URL` and `ISSUER_NAME`.
4. Use `ISSUER_APPROVED=false` until the company's explicit approval. This cannot be changed retroactively for issued demonstration certificates.
5. Deploy, then change `NEXT_PUBLIC_BASE_URL` to the actual HTTPS `.onrender.com` URL and redeploy. The first request after 15 minutes of idle time may require about one minute to wake the service.
6. Configure SMTP if you need to demonstrate holder possession; typical SMTP providers may offer a free evaluation allowance, but sender verification is required.
7. Initialize the first staff account via a secure local shell using the same database, not an exposed public bootstrap route.
8. Create a second approver account. Demo issuance requires two different staff identities.

### Alternative: Vercel
Vercel Hobby's terms limit it to personal, non-commercial use. Do not use Hobby for a commercial company pilot; choose Render Free for the demonstration, or a suitably licensed paid platform for production.

### Company-demo acceptance
- Submit a candidate and verify the record is pending.
- Confirm submitting staff cannot approve their own entry.
- Independently approve a passing candidate and obtain certificate ID.
- Verify the ID via URL and QR, export PDF.
- Confirm random incorrect IDs fail.
- Suspend then verify the credential becomes invalid.
- Re-activate suspended certificate with reason and audit trail.
- Revoke then confirm reinstatement is impossible.
- Generate a test API token, inspect the masked verification response.
- Configure SMTP; confirm the code goes to the **issuer-recorded holder address**.
- Confirm the same certificate cannot be claimed by two distinct EDN subjects on the same client.
- Confirm the status API reports subsequent revocation.

## Free-tier caveats
The free demo is not a production-grade availability or backup commitment. Supabase Free projects may pause after about seven days of inactivity, and free-tier projects lack downloadable managed database backups; maintain an independent database export before any important demonstration. Before a real public rollout, obtain the organization's authorization, issue governance, privacy assessment, production backup/restore drills, SMTP sender verification, hosting with suitable commercial terms, and independent penetration/testing and regulatory review.

## No payment needed to develop
All code is stored in GitHub. Upgrading hosting should require changes to deployment configuration, not rewriting the certificate platform.
