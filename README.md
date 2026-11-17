# TOC Investment — Touch of Class

Responsive bilingual website and integrated customer/staff platform for **TOC Investment Company Limited**, built from the user-supplied **159-page “TOC Website Blue Print (1)_compressed.pdf”** (November 2026). The owner's instruction to include **ICT & Cleaning** is applied across the catalogue, intake, routing, quotations and delivery workflows—not just landing-page cards.

**This branch is a locally tested implementation, not a production-readiness certificate or a deployed enterprise service. Keep preview mode enabled until the launch gates are signed off.** See the [page-referenced coverage matrix](docs/BLUEPRINT-COVERAGE.md) for implemented features, alternatives and remaining dependencies. Work is maintained in GitHub, not Drive.

## Included

- Five service divisions: Events, Catering, General Cleaning, ICT & Digital Solutions, Entertainment & Production.
- Public corporate/service pages, gallery, projects, clients/testimonials, news, careers, supplier opportunities, downloads and leadership. Unapproved business evidence is not invented to fill empty sections.
- English/Kiswahili public content and workspace labels; responsive navigation, keyboard controls, reduced motion, accessible labels/errors, desktop/mobile CMS previews.
- Conditional five-step RFQ plus receipt (six journey states), final customer review, original-language records, consent/notice version, region, additional divisions, service-specific assessment fields, nonbinding approved-rate estimator and complete downloadable handover.
- Opt-in seven-day device drafts and owned, incomplete, versioned 30-day account drafts. Saving a draft does not submit an inquiry or pre-record consent.
- Save-first contact/RFQ notifications to **info@tocinvestment.co.tz**, transactional acknowledgement/staff outbox, bounded leased retries, one-use guest claim links and truthful delivery statuses.
- Individual verified accounts, password/reset/invitation workflows, encrypted staff TOTP MFA, scoped roles, independent commercial delegation and audit history. Production `/staff` redirects to `/admin`; the old shared-password API is preview-only.
- Customer portal for owned requests, messages, issued quotations/PDFs, acceptance/decline, bookings, delivery timelines, private documents, feedback, profile, owned data export and rights requests.
- Staff CRM: assignments, priorities, follow-ups, original-preserving classification correction, reviewed qualification/loss outcomes, internal notes and CSV export with spreadsheet-formula protection.
- Custom structured CMS: 17 content types, revisions/restoration, autosave, independent review, scheduling/expiry, controlled withdrawal, bilingual fields, rights/evidence gates, media, SEO, navigation, footer and managed redirects.
- Versioned price books, fixed-point calculations, immutable quotation/PDF snapshots, discounts/tax justification, independent technical/finance/final approval, exact-current-version customer acceptance. **An estimate, inquiry or acceptance is never a confirmed booking.**
- Explicit operations confirmation, transactional resource capacity/maintenance checks, independently approved dated supplier arrangements, recurring Cleaning visits/checklists/supervisor review, sequential ICT delivery gates and separate internal/customer progress evidence.
- Department-scoped cohort reports, qualification/response/turnaround denominators, separate quoted/booking values, filtered/paginated audit history, operational settings and worker history. Invoice/collected values are `null`, not invented revenue.
- One governed assistance gateway covering the blueprint's eight AI capabilities. Public sources are published-only and revision-cited; staff scope drafting remains unsaved/review-only. Provider-disabled guidance is clearly identified as non-generative.
- Private quarantined uploads, signature/size checks, image re-encoding, scanner/checksum gates, role/ownership checks, bounded APIs, additive SQLite migrations and isolated backup/restore verification tooling.

## Run locally

Node.js **22 LTS** and npm are recommended (Next requires Node ≥20.9). Native SQLite may require a C++ toolchain; in this workspace `npm_config_nodedir=/usr/local npm ci` uses the installed Node headers when needed. Never disable TLS validation to install packages.

```bash
npm ci
cp .env.example .env.local
# Privately configure a random SESSION_SECRET of at least 32 characters.
npm run setup:accounts
npm run dev
```

The app binds to `0.0.0.0:3000` and permits Arena preview hosts. Open the live preview or http://localhost:3000 locally. **Browser-facing API calls are same-origin relative URLs**, not sandbox localhost addresses.

`setup:accounts` creates one individual administrator and writes private credentials to ignored, mode-0600 `ACCOUNT-ACCESS.txt`; it never prints them. In production, set the approved `TOC_BOOTSTRAP_EMAIL` privately. Enroll a time-based authenticator at `/admin`, rotate the initial password, secure/remove the credential file, and use audited invitations for subsequent accounts. Administration does not automatically grant quotation/pricing/booking approval. See [staff operating guide](docs/STAFF-GUIDE.md).

```bash
npm run typecheck
npm test
npm run build
npm start
npm run docs:api
npm run docs:coverage
npm audit --audit-level=moderate
```

Copying `.env.example` does **not** configure production integrations. Never commit `.env.local`, access files, databases, private uploads, backups or test fixture credentials.

## Isolated end-to-end checks

The integration suite refuses non-preview/non-fixture targets. It creates a fresh synthetic database/private-storage directory under the OS temporary directory, independent of the normal application database.

```bash
npx playwright install chromium
npm run test:browser:prepare
# Build in preview mode if no build exists, then in another terminal:
npm run preview:qa
# Against that disposable server:
npm run test:browser
```

For another port: `PORT=3001 npm run preview:qa` and `TEST_BASE_URL=http://localhost:3001 npm run test:browser`. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can select an existing browser. `TEST_BROWSER_PHASE=private` runs only the private portion for diagnosis; use the **full suite** for release verification.

`research/blueprint-fixture.json` is ignored and contains **synthetic passwords, session tokens and a TOTP secret**. Do not print, publish or attach it. Stop the isolated server and regenerate fixtures before **each** browser run, including private diagnostics; decisions deliberately change their state. Reports/screenshots/portable exports stay in ignored `research/`. Stop the disposable preview and remove its exact temporary directory when finished; never point cleanup at the normal data directory. Current evidence and limitations are in [QA-RESULTS.md](QA-RESULTS.md).

## SMTP: supplied TOC mailbox

Both forms save the inquiry, routing, claim token and notifications transactionally **before** an immediate staff SMTP attempt. The recipient is fixed to `info@tocinvestment.co.tz`; visitors cannot choose it. The authenticated mailbox is From, the visitor is Reply-To, and every service-specific field/reference is included.

```dotenv
SMTP_HOST=mail.tocinvestment.co.tz
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@tocinvestment.co.tz
SMTP_PASS=
```

Configure the real password **only in the host's secret environment**. It has not been supplied or verified here. Port 465 uses implicit TLS and certificate verification; IMAP 993/POP3 995 are not needed for sending.

- `preview_local_only`: saved in the preview; no automatic mail leaves it, even with credentials.
- `saved_for_review`: saved, SMTP password absent; durable notification remains pending.
- `email_sent`: staff notification accepted by the SMTP server, **not proof of mailbox delivery**.
- `email_failed`: inquiry/reference preserved; durable staff notification is eligible for bounded retry.

Customer acknowledgements, verification/claim links, staff assignments, messages, reminders and operational updates use the outbox and require a scheduled worker. Staff direct attempts and worker retries share stable Message-IDs and preserve Reply-To. Delivery is **at least once**, not an impossible exactly-once SMTP guarantee: an interrupted response can cause a repeat after lease recovery. Up to five attempts are retained; exhausted jobs require operator review.

Set `NEXT_PUBLIC_PREVIEW_MODE=false` **at build and runtime**, set the approved HTTPS `NEXT_PUBLIC_SITE_URL`, rebuild and restart only after launch approval. A Git push, GitHub Pages or standalone HTML cannot activate server email. Verify actual mailbox/spam receipt, both forms/all fields, Reply-To, outage behavior and SPF/DKIM/DMARC from the chosen production host.

## Deployment, data and integrations

This is a **single-node modular monolith**: Next.js/React/TypeScript, a custom governed CMS, SQLite WAL and private filesystem storage. It is not Payload/Directus, PostgreSQL or managed object storage. The blueprint allows a structured modular monolith; the infrastructure alternatives and scale boundary are explicit in [deployment guidance](infrastructure/README.md).

- Persist `DATABASE_PATH` and `PRIVATE_STORAGE_PATH` on private encrypted volumes, never under `public/`. Do not deploy to ephemeral serverless storage, NFS/shared SQLite, or independent replicas.
- Additive, idempotent schema upgrades are in `lib/platform-store.ts` (current `user_version=7`); existing inquiry data is retained. Back up **before** an upgrade. There is no destructive downgrade script.
- Run `npm run jobs:run` every minute through a supervised timer. Examples are provided, not installed or enabled automatically.
- `npm run backup:verify -- /private/new-backup-directory` uses SQLite online backup and checks an isolated restored database and document hashes. It does not replace offsite encrypted backup or a production disaster-recovery rehearsal.
- `npm run ops:check` exits nonzero for a stale/missing worker, overdue pending mail, exhausted notifications or database failure. Connect it and `/api/platform/health` to an approved external alerting service; no alert destination is configured here.
- Uploads remain quarantined until a configured executable scanner returns clean. `MALWARE_SCANNER_PATH` is a server-only absolute executable path, not a shell command. Scanner configuration is not proof of scanning efficacy.
- AI requires explicit enablement, data-processing approval, HTTPS provider URL/model/key and an attempt budget. No real provider is configured. Public guidance/ordinary inquiry and structured staff drafting work without it. Do not submit credentials or sensitive production/customer data.
- Online payments, accounting reconciliation, SMS/WhatsApp sending, external visitor analytics and HR/applicant processing are **not connected or represented as completed integrations**. They require approved providers, policies and workflows. Manually attesting booking payment conditions is not payment processing. Invoiced/collected reporting remains unavailable.
- Device language preference is stored separately from identity. CMS translations and core screens are bilingual; original customer/staff records and some technical diagnostic/schema text remain in their source language. Fluent editorial and legal translation sign-off is still required.

API contract: [docs/openapi.json](docs/openapi.json), generated by `npm run docs:api`; [API notes](docs/API.md) explain conditional validation, authorization and stateful constraints. [Data and security runbook](docs/OPERATIONS.md) covers recovery, monitoring, privacy and incidents.

## Content and media provenance

No clients, completed projects, testimonials, certifications, equipment quantities, prices or response-time guarantees have been fabricated as TOC facts. Synthetic QA business records exist **only in isolated fixtures**. Public empty states are intentional until authorized material is published.

The five requested service divisions are included. Operational scope, staff competencies, equipment, written ICT security authorization and safety procedures still require business confirmation before live commitments. Phone/location values are source-derived, not independently verified. Ambiguous postal boxes/legal identifiers are withheld. Company-controlled social/WhatsApp accounts can be entered through reviewed CMS content; none are invented.

| Asset | Origin / restriction |
| --- | --- |
| `hero.webp` | AI-generated illustrative ballroom |
| `general-cleaning.webp`, `ict-solutions.webp` | AI-generated illustrative division artwork; not evidence of TOC work or personnel |
| Event/Catering/Production, About and gallery images | Design references extracted from the earlier supplied blueprint/profile material; no established commercial publication licence |
| Vector wordmark | Interpretation requiring TOC approval or official artwork replacement |
| Manrope / Inter fonts | Locally hosted; SIL OFL notices in `public/fonts/` |

Before launch, replace/approve illustrative media and record appropriate rights. Seeded design imagery is **not** evidence of permission; the CMS gates apply to subsequent editorial publication. Preserve illustrative captions. Bilingual copy, contacts, branding, policies and business claims require TOC review.

## Portable public design preview

```bash
npm run export:portable
npm run test:portable
```

Writes `research/TOC-Website-Preview.html` by default. It embeds public design screens, images/fonts/scripts and both languages. It has **no backend**: no account sign-in, CMS, saved records, real estimator or submission. Protected routes explain the boundary; draft/estimator controls are hidden. It exports the source design catalogue, **not a production CMS/database backup**. It must not be mistaken for a deployment. Do not commit the generated HTML or distribute uncleared media publicly.

## Handover index

- [Blueprint coverage / open items](docs/BLUEPRINT-COVERAGE.md)
- [Staff workflow guide](docs/STAFF-GUIDE.md)
- [Design system and screen inventory](docs/DESIGN-HANDOVER.md)
- [API documentation](docs/API.md) and [OpenAPI](docs/openapi.json)
- [Deployment templates](infrastructure/README.md)
- [Operations / privacy / recovery](docs/OPERATIONS.md)
- [Verification evidence](QA-RESULTS.md)
- [Launch sign-off checklist](LAUNCH-CHECKLIST.md)

No production deployment, PR merge, external integration activation or business sign-off is implied by this handover.
