# TOC platform — launch approval checklist

**Current state:** locally implemented/tested five-division website, CMS, portal, commercial and delivery platform, with explicit partial/unconfigured blueprint items. **Keep preview mode enabled. No PR merge, production deployment or live integration activation has been authorized.**

Use [QA evidence](QA-RESULTS.md) for executed checks and the [181-ID + all-page coverage register](docs/BLUEPRINT-COVERAGE.md) for implementation gaps. An unchecked item below is not silently completed by a passing build. Record real people/dates/approvals in the private handover register.

## Scope, business identity and source evidence

- [ ] TOC approves legal/display name, source reconciliation, official logo/vector artwork, palette/type and final English/Kiswahili copy.
- [ ] Verify source-derived +255 677 677 703 and +255 755 439 072, office location/directions and owner-supplied info@tocinvestment.co.tz mailbox.
- [ ] Reconcile ambiguous P.O. Box 1249 / 41217 wording and independently verify any BRELA/TIN/licence claims before publication. Withheld/ambiguous identifiers must not become fabricated facts.
- [ ] Confirm real capabilities, staffing, coverage, equipment, supervision and safety arrangements for **all five requested divisions, including ICT & Cleaning**. Their inclusion is implemented per the owner's instruction; software is not operational certification.
- [ ] Approve actual menus/packages/prices, taxes/exemptions, discounts, terms, deposit/cancellation conditions and delegated limits. No live TOC price/quantity/guarantee is invented by QA or AI.
- [ ] Approve service-specific intake, unknown-date/TBC policy, additional-division detail follow-up and protected post-inquiry upload approach. Decide whether strict initial dates or complete per-additional-division forms are required before final acceptance.
- [ ] Supply only verified consented clients/projects/testimonials/team profiles; factual empty states are preferable to fiction.
- [ ] Decide and commission the remaining partial/optional features in coverage G03–G12; do not describe payments, organization membership, external analytics, HR or arbitrary CMS-only new divisions as implemented.

## Editorial, media and content operations

- [ ] Replace/approve illustrative/generated/source-reference photography and record appropriate commercial rights. Inclusion in the PDF is not a licence. Retain truthful illustrative captions.
- [ ] Approve bilingual alt text/captions/crops and final branding; obtain explicit client/person/logo/media permissions as applicable.
- [ ] Configure named independent editors/publishers; rehearse draft → review → approved → scheduled/live → restore/withdraw with the old live version preserved.
- [ ] Confirm navigation/footer/contact/home controls and actual publication status of each division/content type. Verify withdrawal also removes associated catalogue, rates and AI knowledge.
- [ ] Review real menu/allergen/food-safety language, Cleaning safety exclusions, ICT written testing authorization and Entertainment/music/electrical/rigging/crew claims.
- [ ] Verify company ownership of every entered social/WhatsApp link. No assumed social account/provider is acceptable.

## People, authority and staff workflow

- [ ] Bootstrap individual administrator privately; rotate/remove/seal initial `ACCOUNT-ACCESS.txt` and any preview credentials. No credentials in GitHub, chat, public files or screenshots.
- [ ] Enroll staff TOTP; set up a second controlled administrator for audited identity-verified recovery. Verify verified-email/MFA/session expiry and revocation on departure/role/password changes.
- [ ] Assign minimum roles/departments and management-approved commercial ceilings/discount limits. Administrator is not automatic publisher/price/quotation/booking approver.
- [ ] Assign independent technical reviewers for every division, finance reviewer, delegated final commercial approver and delegated operations confirmer. Rehearse denial of self-approval and stale authority.
- [ ] Rehearse qualification/loss/assignment/follow-up/corrected-routing workflows and meaningful customer-visible replies. Closed lead follow-up is not delivered work.
- [ ] Register real resources/personnel/vehicles and same-division hired/partner suppliers; independently approve supplier evidence/expiry across **all recurring visits**. Rehearse suspension blocking confirmation/start and manual review of affected commitments.
- [ ] Rehearse estimate → immutable offer/review/issue → exact-version acceptance → pending booking → separate conditions/capacity confirmation → visits/gates → supervisor review/closeout/feedback.
- [ ] Validate recurring Cleaning checklists/quality evidence and sequential ICT authorization/testing/handover/acceptance evidence against actual operating procedures.
- [ ] Confirm named customer/staff escalation contacts, handover/training ownership and response expectations. No unsupported response SLA is implied by an urgency choice.

## Privacy and security

- [ ] Legal/privacy lead approves controller details, purposes/lawful bases, notices/terms, special-category handling, retention/legal holds, processor contracts, hosting/transfer locations and incident procedure.
- [ ] Approve identity-verification and manual access/correction/deletion/retention workflows across DB, documents, mailbox, providers and backups. The code does not automatically erase all records or establish legal compliance.
- [ ] Review guest one-use claims, owned portal/export projections, customer/internal message and document separation, and direct cross-customer/department authorization.
- [ ] Configure reviewed scanner executable/signature updates and private storage; test quarantine, malware rejection, image re-encoding, checksum failure and no unauthorized public download. Never mark files clean just to unblock publication.
- [ ] Review HTTPS/cookie policy, proxy trust/header overwrite, edge/shared rate limits, firewall, OS patching, encrypted disks, secrets/recovery, CSP/HSTS and security headers on the chosen host.
- [ ] Complete independent OWASP/authorization/abuse/upload/concurrency/load testing and remediation. npm audit/automated negative tests are not penetration-test certification.
- [ ] Decide audit retention, indexed scale requirements and offsite/immutable evidence needs. Current full-history filtering is date-bounded then processed in memory.
- [ ] Keep SMTP/AI/session secrets, `.env.local`, access files, DB/private files/backups and synthetic secret fixtures out of Git and public deployment artefacts.

## Hosting, worker and integrations

- [ ] Approve final domain, hosting region/capacity, operator/on-call, budget, availability and recovery objectives. The provided templates are unapplied examples.
- [ ] Select the implemented persistent **single-node SQLite/private filesystem** architecture or commission/test the PostgreSQL/object-storage/distributed adapter before multi-instance/serverless use. Do not merely point SQLite at a public/ephemeral/shared volume.
- [ ] Test install/typecheck/unit/build and additive migration on a **copy** of real staging data; take a verified pre-release online snapshot with matching private documents. Preserve a matching code/environment rollback path.
- [ ] Supervise `npm run jobs:run` every minute against the intended DB/storage/secret; verify scheduled publication/expiry, reminders, mail leases/retries, scans, draft purge and retained worker history after restart.
- [ ] Privately set real SMTP password for **mail.tocinvestment.co.tz:465**, `SMTP_SECURE=true`, mailbox **info@tocinvestment.co.tz**. Certificate validation must stay enabled. IMAP/POP3 are not needed.
- [ ] From the approved host, verify both forms/all service details/reference/Reply-To in the **actual TOC mailbox**, acknowledgement/claim links in an authorized test customer's mailbox, spam placement and SPF/DKIM/DMARC.
- [ ] Rehearse missing credentials, SMTP outage, interrupted lease, exhausted retries and save-first receipt preservation without duplicate submissions. SMTP acceptance is not mailbox delivery; outbox delivery is at least once.
- [ ] Configure an optional AI provider only after processor/transfer/secret/model/budget approval; evaluate factual/bilingual/adversarial/limit/outage behavior. Manual inquiry and commercial authority remain independent.
- [ ] Do not activate payments/SMS/WhatsApp/analytics/HR until approved providers, implementation, privacy/security contracts, operational reconciliation and tests exist. Current settings flags accurately remain unconfigured.
- [ ] Connect liveness plus `npm run --silent ops:check` and host/disk/TLS/scanner/backup checks to a real alert destination; exercise alert receipt/on-call ownership. Approve worker/queue thresholds rather than assuming defaults are an SLA.
- [ ] Encrypt/copy verified backups offsite, protect separately backed-up encryption secrets, enforce approved retention and rehearse actual host/database/document recovery. Local isolated restore tests do not establish production RPO/RTO.

## Final acceptance and activation

- [ ] Verify final canonical routes, protected/unknown/unpublished behavior, contact links, redirects, dynamic metadata/sitemap/robots and final-domain assets. Complete remaining locale URL/SEO/translation decisions and editorial link crawl.
- [ ] Test final content on actual mobile/tablet/desktop and constrained/interrupted networks; assess Core Web Vitals **LCP≤2.5s, INP≤200ms, CLS≤0.1 at agreed p75** using an approved measurement/privacy plan. No current RUM evidence establishes these targets.
- [ ] Perform manual keyboard, screen-reader, zoom/reflow, focus, contrast, long-content, reduced-motion and full WCAG 2.2 AA review. Sampled Axe zero violations is not full conformance.
- [ ] Obtain user-task UAT, fluent translations, staff training, source/design/handover acceptance and named maintenance ownership. Supply separate Figma/official brand artefacts if commissioned.
- [ ] Ensure staging/preview synthetic DBs/credentials/fixtures are **not** the production data source. Do not send pending preview outbox records to live recipients.
- [ ] Approve an actual release/merge/deployment separately; this session does not grant that authorization.
- [ ] Only after sign-off: set approved HTTPS `NEXT_PUBLIC_SITE_URL`, set `NEXT_PUBLIC_PREVIEW_MODE=false` consistently at build/runtime, rebuild/restart, verify production indexing and all dependencies, and monitor launch. A Git push/portable HTML cannot activate server email.

**Sign-off remains open:** business owner, editorial/brand, finance/commercial, operations/safety, privacy/legal, security/accessibility, hosting/recovery and training/maintenance. Keep real signatures and sensitive operational contacts in the private handover register.
