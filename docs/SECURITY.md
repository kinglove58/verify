# Registry trust and security controls

## What is actually proven?
- **Credential record exists:** public lookup or partner certificate check confirms status.
- **Person controls issuer-registered email:** holder confirmation sends a short-lived OTP to the email on the issuer's record.
- **Legal identity matches credential:** EDN Light independently matches name and identity-verification signals or routes manual review.
- **Authorized for regulated electrical work:** requires separate NEMSA or other applicable credentials, outside this training registry.
- **Eligible for hiring:** EDN Light decision including appropriate identity tier, background/credential checks, service area, professional status, membership, and current compliance.

## Existing controls
- Single authorized staff-member approval (admin or approver); every decision is audited. A submitting officer may also approve their own record. This is a deliberate operational simplification with reduced separation of duties.
- Only successful assessments can lead to issuance.
- Random 80-bit certificate IDs (not sequential).
- Revoked certificates cannot be reactivated.
- Every issue/transition creates immutable event log records.
- Staff passwords hashed with bcrypt; no staff passwords in database in plaintext.
- Opaque HttpOnly SameSite session cookies; server-side sessions are hashed and time-limited.
- Server API credentials are randomly generated, shown once, stored only as hashes, revocable.
- SMTP holder OTP is bound to partner client, certificate ID, EDN subject, 10-minute expiry and five attempts; old codes are invalidated.
- Public verification never reveals contact fields or full holder name.
- Configurable demo issuer flag; already-issued demo certificates remain demo.
- No API secrets exposed via frontend environment variables.
- HTTP response hardening and no-store headers on verification responses.
- SQL queries are parameterized and main writes use database transactions.

## Production readiness items that need real infrastructure
- Configure database backups and retention, test restoration.
- Production mail service and verified sender/domain.
- Verify your legitimate basis to process candidate details under Nigerian data-protection law, publish privacy notices, and establish correction/retention procedures.
- Use a service-level monitoring/alerting provider; alert for 5xx errors, suspicious rate spikes, and claim delivery failures.
- Apply strong administrative MFA through a trusted identity provider before large-scale public production. Password-only accounts are for the demo.
- Run external dependency scans, penetration tests, recovery drills and contract/legal review.
- Add signed webhook invalidation or frequent EDN polling for immediate cross-system revocation handling at scale.
- Free-tier hosting has no guaranteed always-on availability.

## Never do
- Claim that this registry issues NEMSA licences.
- Give production 'verified and hireable' badges to demo certificates.
- Automatically mark someone verified using an ID alone.
- Store private API tokens, SMTP passwords, database credentials, or applicant lists in GitHub.
- Email credentials to the address chosen by an unverified user.
- Treat an unavailable verification API as successful.
