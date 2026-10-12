# Certificate registry API contract (v1)

All partner routes require a bearer credential created by a registry administrator. Configure the secret on the EDN Light **Fastify server**, never under `VITE_` or in the Capacitor mobile bundle. Serve through HTTPS in production. Responses are JSON with `Cache-Control: no-store`.

## 1. Certificate verification
```http
POST /api/v1/integrations/certificates/verify
Authorization: Bearer <server-api-token>
Content-Type: application/json

{"certificateId":"SMT-2026-XXXX-XXXX-XXXX-XXXX"}
```
Successful response (illustrative, identifier is placeholder):
```json
{
  "verified": true,
  "certificate": {
    "id": "SMT-2026-XXXX-XXXX-XXXX-XXXX",
    "status": "active",
    "type": "training_completion",
    "course": "Smart Meter Installation",
    "issuedAt": "2026-10-12",
    "expiresAt": null,
    "issuer": "Demonstration Training Organization",
    "isDemo": true
  },
  "holder": {
    "displayNameMasked": "A*** O***",
    "contactHint": "ad***@example.com"
  },
  "holderMatch": "ownership_challenge_required",
  "eligibleForHire": false
}
```
**Never** mark a professional fully verified based solely on this response. A certificate lookup is not proof of possession.

## 2. Begin certificate ownership challenge
```http
POST /api/v1/integrations/claims/start
Authorization: Bearer <server-api-token>
Content-Type: application/json

{"certificateId":"SMT-2026-XXXX-XXXX-XXXX-XXXX","subjectRef":"edn-account-id"}
```
Response: `202 {"challengeId":"<uuid>","deliveredTo":"ad***@example.com","expiresInSeconds":600}`.
The six-digit code is sent by SMTP to the **issuer-recorded email**, not an email supplied by the claimant. A challenge expires in 10 minutes, allows five attempts, invalidates earlier pending challenges, and is rate-limited to three sends per credential/client/hour.

## 3. Complete holder confirmation
```http
POST /api/v1/integrations/claims/complete
Authorization: Bearer <server-api-token>
Content-Type: application/json

{"challengeId":"<uuid>","subjectRef":"edn-account-id","code":"123456"}
```
Response:
```json
{
 "certificateId":"SMT-2026-XXXX-XXXX-XXXX-XXXX",
 "holder":{"fullName":"Example Person"},
 "credential":{"course":"Smart Meter Installation","issuer":"Demonstration Training Organization","isDemo":true,"status":"active"},
 "subjectRef":"edn-account-id",
 "holderMatch":"confirmed"
}
```
Only then can EDN Light compare the verified holder name with its separately identity-verified account, perform its own competency/regulatory checks, and make a hiring eligibility decision.

## 4. Current certificate status after onboarding
```http
POST /api/v1/integrations/claims/status
Authorization: Bearer <server-api-token>
Content-Type: application/json

{"certificateId":"SMT-2026-XXXX-XXXX-XXXX-XXXX","subjectRef":"edn-account-id"}
```
Returns status: active / suspended / revoked / expired, holderMatch=confirmed, isDemo, and issuer, **only** for an already linked certificate and subject. EDN should refresh at login, before hiring/booking, and periodically; suspend the relevant badge/eligibility if revoked, expired, or verification is unavailable (fail closed).

## 5. Public status check
`GET /api/v1/public/certificates/:id` requires no API key. It exposes a masked holder name, training program, issuer, dates, status, and demonstration flag. It does not expose email, phone, or other private personal data.

## EDN Light implementation sequence
The existing EDN Light repository already has:
- `src/ServicesPage.tsx` professional onboarding UI and credential badge logic.
- `server/platform/services-routes.js` credential submission routes.
- `server/platform/services-repository.js` verification workflow and audit events.

Extend those existing workflows with a **server-only registry connector**. Suggested EDN Light route sequence:
1. On credential submission, accept issuer designation + certificate ID; store a pending claim. Do not use the UI directly to call Verify.
2. Server POSTs to `certificates/verify`; if active and not demo, offer ownership challenge. A demo may be shown in a sandbox presentation but **must not confer production eligibility**.
3. Start the challenge and present a masked delivery hint and code-entry screen.
4. Server completes the challenge bound to the authenticated EDN Light user ID.
5. Ensure registry legal name matches EDN identity-verification name according to a documented review policy.
6. Reuse existing professional verification records, issuer badges, eligible categories and EDN marketplace membership rules.
7. Re-verify status at hiring time. Any revoked/suspended/expired credential must disable its verification badge and affected eligibility.
8. Provide clear manual review for issuer errors, inaccessible holder email, or identity mismatch. Do not autoapprove on timeout.

This document is a contract; the separate EDN Light repo has **not yet been modified**.

## Response and error conventions
- `400`: malformed request.
- `401`: API authentication missing, invalid or revoked.
- `404`: certificate or linked claim not found.
- `409`: suspended/revoked certificate, conflicting link, invalid or expired challenge.
- `503`: dependent provider / verification unavailable; **never** treat as verified.

Use 5–10 second HTTP timeouts and secrets from an approved secret store. Do not log OTPs, raw tokens, or full protected responses.
