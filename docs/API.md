# API and data contract

Companion to blueprint pp. 86–88, 98, 127, 134–136. The generated [OpenAPI 3.1 contract](openapi.json) covers **71 paths / 72 operations**, shared runtime request validators, principal response projections, permission requirements and errors. Regenerate with `npm run docs:api` after changing validation or routes; do not insert a production hostname, credentials or customer examples into the specification. `lib/platform-api-schema.ts` shares transport-only validators with the route; domain validators remain beside their business rules. Named creation/acceptance receipts, customer projection whitelists, owned JSON export, real download media types and retained legacy inbox responses are specified separately.

Tests compile the JSON response schemas and compare exercised route/browser responses against them using a development-only JSON Schema validator. Reports contain operation templates/status/counts, **not payloads, cookies, record IDs or token query strings**. This detects contract drift in observed responses; it is not an assertion that every state/error of every operation has been exercised. Structured CMS data remains type-specific and stateful/conditional business validation remains server-side.

This is the application's **same-origin API**, not a public integration product. It has no external API key, OAuth client or payment webhook contract. Requests in examples must target an isolated preview with synthetic data. Do not automate commercial approvals or bypass the UI's human review by calling endpoints directly.

## Transport, identity and errors

- Node runtime, JSON request/response except raw uploads and protected file/PDF downloads. Relative base `/api/platform`; public intake is separately `/api/inquiries`.
- Protected routes use the HTTP-only `toc_account_session` cookie, SameSite=Lax, Secure in production, eight-hour expiry. Password-authenticated staff receive a ten-minute **pending MFA** cookie; only setup/verification flows can use it. No private credentials, hashes or encrypted TOTP secrets are included in session/workspace responses. MFA enrollment intentionally returns its own secret to the enrolling user; handle it as a credential.
- Platform and public-intake mutations validate origin and apply a bounded per-instance rate limit. Cross-site `Sec-Fetch-Site` is rejected. Legacy preview login has its own limit; retained legacy logout/status endpoints do not have the platform mutation throttle and must not be used as a production workflow. Production proxy/edge must overwrite forwarded headers and add shared/edge limits; in-memory counters are not a distributed abuse solution.
- General mutation body limit: 40,000 bytes; content mutations: 100,000 bytes; inquiry intake: 24,576 bytes; upload: 5 MiB with streaming bound. Declaring an inaccurate Content-Length cannot bypass streaming limits.
- `400` malformed JSON/content type; `401` verified session/MFA required; `403` role/scope/ownership/independence/origin denied; `404` missing/withdrawn record; `409` state, version, duplicate or resource conflict; `413` oversized; `422` validation; `423` quarantined/rejected file; `429` throttle; `503` dependency not enabled/available. Unexpected platform failures return a generic message and request ID, not a raw exception or customer payload.
- JSON errors use `{ "error": "…", "requestId": "optional", "fields": "optional" }`. Intake `fields` is a key/message map; platform validation uses `[{ "path": "…", "message": "…" }]`. Business rules can reject a structurally valid JSON body.
- Timestamps are ISO UTC, EAT is used for displayed dates and inquiry report cohorts. Date-only quotation expiry is evaluated against Tanzania's date. Money is decimal **input strings** and integer minor-unit totals (TZS 1.00 = 100 minor units), not floating-point currency. Discounts and tax use basis points (100 bps = 1%).

## Public intake: save before notification

`POST /api/inquiries`, Content-Type `application/json`. Send a stable `Idempotency-Key` of 16–128 `[A-Za-z0-9_-]` characters for one submission attempt. Exact validated-payload retry returns `201`, the stored receipt and `Idempotency-Replayed: true`. Reusing a key for a changed validated payload returns `409`. A replay is checked before re-resolving withdrawn rate choices. Client prices are never authoritative.

Minimal synthetic ICT example (no files or secrets):

```json
{
  "origin": "quotation",
  "schemaVersion": 1,
  "language": "en",
  "privacyNoticeVersion": "2026-11-17",
  "service": "ict-solutions",
  "ictCategory": "website",
  "urgency": "planning",
  "deliveryMode": "remote",
  "name": "Synthetic Example",
  "email": "example@example.test",
  "phone": "+255700000001",
  "organization": "Synthetic Test Organization",
  "region": "remote",
  "location": "Remote discovery discussion",
  "dateFlexible": true,
  "message": "Please assess a synthetic website discovery requirement. No real credentials.",
  "consent": true,
  "website": ""
}
```

Successful receipt:

```json
{
  "reference": "TOC-2026-EXAMPLE",
  "createdAt": "2026-11-17T12:00:00.000Z",
  "deliveryStatus": "preview_local_only"
}
```

The reference above illustrates a response, not an existing record or authorization credential. Real inquiry references are allocated by the database; never parse them to infer access. In preview only, a synthetic test may receive `previewClaimPath`.

**Conditional validation not fully expressible in generated JSON Schema:**

| Division / origin | Additional rules |
| --- | --- |
| All RFQs | Valid published service (or guidance), name/email/telephone, region/location, consent. Dates must be real and nonpast when supplied; a date is required when `dateFlexible=false`. Duplicate/primary additional divisions are rejected. |
| Event Management | Approved occasion, positive attendance, `cateringRequired=yes/no`. Yes reveals Catering assessment and adds Catering routing/authority. |
| Catering | Occasion/attendance, at least one listed requirement or menu-guidance choice, approved serving style or `discuss`; dietary text is bounded, not a medical-record field. |
| Cleaning | Approved property category, cleaning service choice, recurrence/frequency. Area positive if known; floors integral/positive if supplied; valid future inspection date; supplies/access text bounded. |
| ICT | Approved ICT category/urgency; ≥10-character problem description; bounded environment/users/consultation/remote preference. No requested passwords/API keys. |
| Entertainment | Occasion/attendance, at least one listed technical/production requirement, bounded timing/power/safety details. Customer choices never certify actual technical availability. |
| Contact | `origin=contact`, valid name/email, ≥10-character message, consent; telephone optional. |

The server saves inquiry, original payload, departmental work, acknowledgement, guest claim and staff notification atomically. Only then does it attempt the staff SMTP notification. `email_sent` means SMTP acceptance; `saved_for_review` means missing credentials; `email_failed` leaves a durable retry; preview never sends. Saved receipts survive notification/bookkeeping failure. Do not create a second inquiry because a mail attempt failed.

A queued notification is not customer contact, commercial qualification, quotation issuance, payment receipt or a booking. Queue consumers are leased and bounded, not exactly-once SMTP. See [operations](OPERATIONS.md).

## Endpoint families

The full machine contract lists every operation. The most important entry points are:

| Family | Endpoints / purpose |
| --- | --- |
| Public content | `GET /public`, `/content?type=…`, `/pricing`, `/equipment`, `/health`; published-only projections. Public file endpoints validate a currently published reference and clean scan. |
| Identity | `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/verify`, `/auth/resend`, `/auth/reset-request`, `/auth/reset`, `/auth/mfa-setup`, `/auth/mfa-verify`; `GET /auth/session`. Verification/reset responses are enumeration-resistant in production. |
| Drafts / claiming | `GET/POST /auth/inquiry-draft`, `POST /auth/inquiry-draft/delete`, `/inquiries/claim-link`, `/inquiries/claim`. Owned incomplete drafts expire after 30 days, cannot carry true consent, use version 0 for creation. A claim requires a one-use token **and** a verified matching-email account. |
| Customer records | `GET /portal`, `/inquiries/{id}`; `POST /messages`, `/feedback`, `/auth/profile`, `/auth/password`; protected documents and exact-version quotation PDFs. `/portal` forces a customer-only principal even for a staff account. |
| CRM | `POST /admin/inquiries` assignment, `/classification` reviewed rerouting, `/assessment` qualification/outcome. The original submitted service/text is preserved; corrections do not rewrite evidence. |
| Commercial | `POST /estimates`, `/admin/pricing`, `/admin/pricing/approve`, `/admin/quotations`, `/admin/quotations/action`, `/quotations/accept`, `/quotations/decline`. |
| CMS | `POST /admin/content`, `/admin/content/action`, `/admin/redirects`; `GET /content/{id}/history`, `/company-documents`; raw upload plus protected media preview. |
| Operations | `POST /admin/resources`, `/admin/suppliers`, `/admin/suppliers/action`, `/admin/bookings`, `/admin/bookings/action`, `/admin/visits`, `/admin/projects/milestone`; `GET /suppliers`. |
| Management | `GET /workspace`, `/reports`, `/audit`; `POST /admin/users/invite`, `/admin/users/access`, `/admin/users/reset-mfa`, `/admin/settings/operations`, `/admin/jobs`. |
| Privacy | `GET /auth/data-export`; `POST /privacy-requests`, `/admin/privacy/action`. Manual review, not an automatic erasure endpoint. |
| Assistance | `POST /assistant`: `chat`, `recommend`, `inquiry-draft`, `quotation-draft`, `content-draft`, `translate`, `classify`, `analytics`, `portfolio`. Public and privileged modules have different server-enforced permissions. |

Legacy `/api/staff/*` routes remain only for the older preview inbox. They are disabled as production access; use individually authenticated `/admin` workflows instead.

## Stateful invariants

1. **Ownership and department scope** are checked on the server before reading/mutating a record. A reference, guessed UUID, menu visibility or accepted email address is never sufficient. Customers see only owned, specifically projected records; internal notes, staffing, supplier evidence, approval identities, draft offers and rate provenance are omitted.
2. **Optimistic versions** are required for work, content, drafts, resources, suppliers, bookings, visits, milestones, settings and rights reviews. A conflict returns `409`; refetch, compare and deliberately reapply. Never blind-retry a stale edit. Quotation approvals identify an immutable exact-version UUID, with current-state checks instead of overwriting its snapshot.
3. **Commercial authority** is distinct from administration. Server-resolved approved rule references or reasoned manual proposals → author submission → independently scoped technical reviews for all divisions → independent finance → separately delegated final reviewer within current ceilings → explicit issue. Issuance rechecks authority and routing, and preserves earlier versions. A changed manual line clears its rate provenance in the editor.
4. **Acceptance** records the exact current, issued, nonexpired version and exact terms. It does not reserve resources. A pending booking has one unique quotation-version relationship; confirmation requires all division delegations, conditions/safety evidence and transactional capacity/supplier checks. Starting work rechecks resource/supplier validity.
5. **Recurring Cleaning** is bounded to 52 visits. Daily/weekly/monthly visits are separate checklist/supervisor records; monthly dates clamp to the actual month's last day. Resource allocations conservatively span the entire contract horizon. Maintenance and supplier expiry must cover the last visit, not only the first.
6. **ICT gates** are ordered Discovery → Design → Authorization → Implementation → Testing → Handover → Closure, with internal evidence and an optional separately reviewed customer update. The software records authorization evidence; it cannot determine the legal adequacy of a written security-testing authorization.
7. **Publication** does not expose internal operational records. It uses separate, independently reviewed content revisions. Editing a live item creates a new draft. Withdrawn service/project content is removed from public retrieval immediately; direct live retrieval needs no asynchronous vector-index purge. Seeded illustrative assets still require rights approval before launch.
8. **Uploads** use a raw binary request to `/documents/upload?inquiryId=…&name=…` (or authorized company scope). No multipart parser. Streaming size/signature bounds, safe UUID storage, image re-encoding, private quarantine, clean scan and checksum are mandatory. Do not upload genuine technical diagrams/logs into a public demonstration.
9. **Reports** apply permitted divisions and EAT inquiry-created cohorts. Qualification is a human-reviewed assessment; response means the first retained customer-visible staff message, not an automated acknowledgement. External mailbox replies/visitor attribution are not imported. Invoice/collected amounts remain `null` because those systems are not connected.
10. **Audit** filters authorized history by UTC dates, actor/action/target/text before pagination (`limit` 1–100). In this SQLite implementation date-bounded rows are filtered in memory; large deployments need indexed database-side filtering/retention design. This is an application audit trail, not immutable offsite/WORM evidence.

## Data model / storage

`lib/database.ts` retains the original inquiries/status audit. `lib/platform-store.ts` adds platform schema version 7 without deleting those records.

```text
platform_users -- sessions / hashed one-use tokens / profiles / owned drafts
       |            | roles + departments + separately delegated authority
       +-- inquiry_work -- inquiries(original JSON) -- messages / private_documents
                           |                         | customer/internal visibility
                           +-- quotations -- immutable quotation_versions
                                               +-- bookings -- resource_allocations -- resources
                                                      |                                  +-- approved suppliers
                                                      +-- service_visits (checklist/review)
                                                      +-- delivery_projects (ordered gates)
content_items -- draft/published pointers -- content_revisions (source/approval/SEO)
content_redirects   price_books   notification_outbox   delivery_attempts
platform_audit     job_runs      platform_configuration   ai_usage
privacy_requests   privacy_events   customer_feedback   idempotency key hashes
```

Organization name is currently a profile/contact field, **not** a shared organization-membership/access model. Private filesystem storage and SQLite are a single-node alternative to the blueprint's recommended managed PostgreSQL/object storage; see [infrastructure](../infrastructure/README.md). Foreign-key relationships, unique constraints, transactions, bounds and explicit projections protect the implemented workflows; an ERD does not substitute for a production security review.
