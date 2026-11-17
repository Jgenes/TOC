# TOC platform — verification evidence and limitations

**Review date: 17 November 2026.** Current scope is the five-division public website **plus** customer accounts, individual staff access, CMS, CRM, commercial review, delivery and governed assistance, including **ICT & Cleaning**. This replaces the earlier public-only verification notes; the historical 11/28-test counts and “CMS/portal/retries not implemented” statements no longer describe this branch.

**Result: the executed local checks below passed. This is not complete blueprint parity, a production-readiness certificate, live provider acceptance or permission to merge/deploy.** Keep preview mode enabled pending [launch sign-off](LAUNCH-CHECKLIST.md). See the [all-page/181-ID coverage register](docs/BLUEPRINT-COVERAGE.md) for genuine gaps and alternatives rather than interpreting test totals as feature-completion percentages.

## Latest executed checks

| Check | Result / evidence boundary |
| --- | --- |
| TypeScript | `npm run typecheck` passed, including scripts and the reviewed coverage renderer. |
| Automated unit/API/security/business/documentation | `npm test`: **85 tests passed, 0 failed/skipped**. Real isolated SQLite/filesystem data and controlled provider doubles, not production customers/integrations. |
| Both build configurations | Optimized Next.js build passed with `NEXT_PUBLIC_PREVIEW_MODE=false` and a reserved `.invalid` HTTPS verification origin, then passed with preview true for browser QA. This did not activate a production host. |
| Full combined browser suite | **28 check groups passed**, **19 sampled Axe audits**, **0 reported violations**, **0 runtime exceptions**, **0 contract errors**. Full phase, completed **2026-11-17T10:56:47.432Z**. |
| Browser/API contract | **209 captured server responses across 20 operations** matched the generated response projections; zero interrupted-after-validation deliveries in this run. This is observed positive/validation-flow evidence, not every error/state of every API operation. |
| Anonymous API boundary | An automated matrix exercises **all 67 `/api/platform` operations**: protected operations require authentication; public read/validation/not-found responses match their contract. Authenticated negative/ownership/department/business tests are additional checks. |
| OpenAPI | `npm run docs:api` passed: **71 paths / 72 operations / 111 schemas**. OpenAPI 3.1 validator passed; references/operation IDs/security declarations/source-route inventory and all JSON response-schema compilation passed. Runtime-shared input schemas and exercised response validation reduce drift. |
| Coverage/handover integrity | `npm run docs:coverage` passed. Tests verify 181 unique supplied IDs, exact group numbering, narrative coverage of physical pages **1–159 without omissions**, existing evidence paths, honest partial statuses, handover links, deterministic rendering and no credential/storage initialization by documentation generators. |
| Standalone export | `npm run export:portable` compiled the **4.45 MB** public-only HTML; all **7 portable check groups** passed, completed **2026-11-17T10:52:14.709Z**. |
| Portable network/runtime | Opaque-origin `sandbox="allow-scripts"` iframe: **0 external requests / 0 JavaScript runtime exceptions**. No backend/sign-in/submission is claimed. |
| Formatting/patch hygiene | Prettier checks passed for application/components/libraries/portable/scripts/tests; `git diff --check` passed. |
| Dependencies | `npm audit --audit-level=moderate`: **0 reported vulnerabilities** at check time, including development dependencies. This is a point-in-time advisory check, not a security guarantee. |
| Secret/generated-file exclusion | Candidate source-file scan found no current private environment/fixture credential values or private keys; `.env.local`, access files, DB/private documents/backups, source PDF, generated HTML and browser fixtures/reports remain excluded from Git. |

Machine reports are local, ignored files: `research/blueprint-browser-report.json`, `research/portable-browser-report.json`. Their summaries are recorded here so evidence does not depend on publishing secret-bearing research directories. The separately retained diagnostic private-phase report is not substituted for the final full run.

## Public and bilingual browser coverage

The full suite uses a fresh disposable synthetic database/server, not the normal application database. It checks:

- **24 public/editorial routes × English/Kiswahili × 1440/768/390/320 px = 192 layout combinations**: one H1, no detected horizontal overflow, no broken loaded images.
- Published canonical/social metadata, a genuine unknown-page 404 and keyboard/touch mobile navigation.
- **All five divisions in both languages**: approved-rule nonbinding estimate → service-specific RFQ → review/explicit consent → real saved reference → complete downloaded handover. ICT and Cleaning are active routes/workflows, not disabled proposals.
- Conditional Event→Catering assessment and all-division routing/authority have automated validation/business regressions. Other additional divisions are routed, but full separate specialized forms for every additional service remain a disclosed gap.
- An injected stale-rate `422` checks recoverable form error/edit/review behavior; that one response is a browser test double. The successful estimate/submission responses are generated by the isolated local server.
- Contact preserves selected Kiswahili, returns a real `201`/preview receipt and displays its saved state before navigation.
- Owned incomplete account drafts save/resume/delete without submitting, pre-recording consent or exposing another account's draft.

The browser contract check captures the real same-origin server response through Playwright `route.fetch` before returning the same bytes/status to the browser. It does not log/store payloads, cookies, concrete record IDs or token query strings. This avoids mistaking Chromium's released/cancelled background-read bodies for schema failures. It is **instrumented local HTTP**, not a production-wire latency/performance benchmark; page-level injected error responses are explicitly identified above. The unit/API suite independently calls route handlers against isolated storage.

## Customer, staff and delivery browser coverage

- Eight customer sections at desktop/mobile: owned requests, messages, issued quotation/PDF access, exact-version acceptance, bookings, delivery timeline, documents, profile/rights and private-feedback entry points.
- Internal-note exclusion, protected PDF signature/download and keyboard mobile workspace navigation.
- Customer explicitly accepts the **current issued ICT version**. This does **not** automatically create a confirmed booking.
- Individual staff password + authenticator login and 18 staff sections at desktop/mobile.
- ICT booking filters resources/supervisors to the authorized source divisions, disables Cleaning recurrence, creates pending work and requires **separate explicit operations confirmation** and recorded conditions.
- Human-reviewed qualification; independent dated supplier approval; server-filtered audit evidence; CMS desktop/mobile/language previews; unsaved/review-only quotation scope assistance; English/Kiswahili operational reports.

The checks do not click every action in every screen/state; domain regressions cover many stateful/negative cases below. A sampled working screen is not a signed staff usability or business-authority assessment.

## Automated regression areas

- **Mail/save-first:** fixed recipient, complete form detail/reference, safe From/Reply-To/header handling, strict TLS/certificates, preview suppression even with credentials, missing/invalid configuration, rejected recipient, safe logs, save-before-send, durable receipts on failure, transactional notification deduplication, stable Message-ID, bounded retry/leases and interrupted lease recovery. No real TOC mailbox authentication or receipt was tested.
- **Identity/access:** scrypt passwords, verified email, hashed/expiring/one-use links, resets/session revocation, encrypted/replay-resistant TOTP, MFA-only staff boundaries, scoped roles/delegations, direct cross-customer/department/API/file/PDF/export denial and isolated bootstrap recovery/configuration.
- **Intake/CRM:** distinct five-division validation, conditional Events/Catering, mandatory consent, honest TBC date policy, atomic work/claim/ack/staff queue, payload-bound idempotency/replay/conflict, current-rate re-resolution, bounded incomplete drafts, optimistic assignments/classification/assessment, preserved original payload and qualification/loss invariants.
- **Editorial:** draft versus live pointers, independent review, optimistic conflicts, scheduling/expiry/restore, permissions/source references, rights/bilingual-alt/safe-link gates and immediate withdrawal from public catalogues/rates/assistant sources.
- **Commercial:** fixed-point inclusive/exclusive tax/quantity/discount rounding/bounds, independent dated price books, approved-rule provenance, immutable exact quotation versions, separate technical/finance/final authority, issuance recheck, historical issued access, valid exact-term/version acceptance and acceptance≠booking.
- **Operations:** transactional overlap/capacity/maintenance and cancellations, same-division approved suppliers, editing revokes supplier approval, numeric expiry comparisons, approval through the **final recurring visit plus duration**, supervisor/checklist review, sequential ICT evidence and completion conditions. Supplier/resource validity is rechecked at **confirmation and start**; suspension prevents start with `409` while preserving confirmed state. The final-visit supplier regression is not misrepresented as a separate maintenance regression.
- **Files/privacy:** streamed size/signature checks, image decode/re-encoding/pixel bounds, quarantine/scanner/integrity, customer/internal visibility, editorial-only company files, explicit private-field exclusion in export, manual identity-attested/versioned rights resolution and controlled expiry of drafts. Scanner behavior is exercised with safe local executable doubles, not a production malware service.
- **Assistance/reporting:** published authorized revision citations, credential refusal, input/source distrust, output-ID validation, provider redaction/budgets/fallback, no write/approval tools, unsaved/nonpricing staff scope drafts, EAT inquiry cohorts, meaningful retained human-response denominators, separate quotation/booking values and disclosed `null` invoiced/collected data.
- **Monitoring/recovery/documentation:** read-only operations checks, thresholds/stale/failed/future/missing worker/queue behavior, no payload/private-path disclosure, no accidental missing-DB creation, additive legacy upgrade, SQLite online snapshot plus isolated DB/document restoration, audit scoping/pagination and credential-free deterministic API/coverage handover.

## Portable public preview

`research/TOC-Website-Preview.html` is an offline design artefact, **not the deployed application**. The suite checks **23 public/alias screens × both languages × 1440/320 px = 92 layout combinations**, gallery filters/lightbox/Escape/focus, ICT/Cleaning deep-link preselection, hidden server-dependent drafts/estimator controls, protected-route explanations and truthful offline submission that retains entered text.

An opaque/insecure viewer does not expose `crypto.randomUUID`; the standalone bundle includes a `crypto.getRandomValues`-based UUID compatibility shim. It does not weaken server authentication or permit network submission. No account login, saved records, CMS state, real pricing or SMTP exists in this HTML. Do not distribute uncleared imagery publicly.

## Test data and reproducibility

Only synthetic names, `.test` addresses, fictional capabilities/prices and clearly labelled test commercial/evidence records were used. The normal application database was not used for browser writes; no final “zero records” claim is made because deliberate test records remain in the disposable fixture until private cleanup. No real email, payment, generative provider or malware service was activated.

```bash
npm run docs:api
npm run docs:coverage
npm run typecheck
npm test
npm run build                       # preview flag must match build/runtime
npm audit --audit-level=moderate
npm run test:browser:prepare         # fresh fixture before EACH browser run
# In a separate terminal, same built application:
PORT=3001 npm run preview:qa
TEST_BASE_URL=http://localhost:3001 npm run test:browser
npm run export:portable
npm run test:portable
```

Install a compatible Playwright Chromium on the test host. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can point to it; this sandbox additionally needed its private temporary library path. The suite refuses a non-preview/non-fixture target. `TEST_BROWSER_PHASE=private` is diagnostic only; use the full phase for release verification. Stop the isolated server before regenerating fixtures and never point cleanup at real data.

`research/blueprint-fixture.json` is mode-0600 and contains **synthetic passwords, session tokens, encryption and TOTP secrets**. Do not print, commit, upload or distribute it. Browser reports/HTML are also ignored. Documentation/source can be reviewed in GitHub without these files.

## Still open — not established by these results

1. **Actual implementation gaps:** provider payments/webhooks/reconciliation/refunds/invoices/collections; organization membership/shared access; full locale URLs/hreflang/metadata/technical translation; complete specialized intake for every additional division; advanced checklist/calendar/rescheduling/CRM/historical/marketing features; general legal retention/erasure and immutable offsite audit. These require additional implementation/scope decisions, not just environment secrets.
2. **Architecture:** implemented SQLite/private filesystem/custom CMS is an explicit single-node alternative, not managed PostgreSQL/private object storage/distributed rate-limiting or queues. No adapter is implied by configuration labels.
3. **Live dependencies:** the real SMTP password is absent; `mail.tocinvestment.co.tz:465` authentication, actual `info@tocinvestment.co.tz` mailbox receipt/spam/DNS checks, production scanner/signatures, approved AI provider, supervised scheduler, real alert destination, hardened host and encrypted offsite recovery remain unverified/unconfigured.
4. **Business/content/legal:** real competencies/resources/suppliers, branding/contacts, media licences, client/project/testimonial permissions, rates/tax/contracts/safety/ICT written authorization, fluent translations, privacy/lawful bases/retention/processors/transfers and management sign-off are not established by code or synthetic tests.
5. **Independent acceptance:** manual keyboard/screen-reader/zoom/WCAG 2.2 AA, OWASP penetration/abuse review, real load/concurrency/recovery/on-call exercises, final-device/low-bandwidth user tasks, training and p75 real-user **LCP≤2.5s / INP≤200ms / CLS≤0.1** evidence remain outstanding. Sampled Axe zero violations is not a conformance certificate.
6. **Release authorization:** no production deployment, PR merge, external integration activation or business/commercial approval was granted or performed.

Related handover: [coverage](docs/BLUEPRINT-COVERAGE.md), [staff workflows](docs/STAFF-GUIDE.md), [API/security/data invariants](docs/API.md), [design/screens](docs/DESIGN-HANDOVER.md), [operations/recovery](docs/OPERATIONS.md), [deployment examples](infrastructure/README.md) and [launch checklist](LAUNCH-CHECKLIST.md).
