# TOC staff and customer workflow handover

Use this guide in an **isolated preview** for training. The implemented workflows do not certify TOC's business capabilities, a price, a legal authorization, a payment or a live service commitment. Production activation requires the [launch checklist](../LAUNCH-CHECKLIST.md). Never share a password, TOTP seed or invitation link in an inquiry, document, GitHub issue or screenshot.

## 1. Accounts and responsibilities

An operator privately runs `npm run setup:accounts` once against the intended database. It writes ignored mode-0600 `ACCOUNT-ACCESS.txt`, not chat/console credentials. The initial administrator enrolls a time-based authenticator at `/admin`, changes the password, secures/removes the bootstrap file and uses **People & permissions** to invite individual staff. Production requires the approved `TOC_BOOTSTRAP_EMAIL`; setup refuses to run again over an existing staff account.

Invitations initially create an ordinary customer account; role/department access must be separately reviewed and assigned. A staff member verifies their email, sets a ≥12-character password, signs in and completes authenticator enrollment. Staff cannot reach privileged APIs with only their password. Password reset does not remove MFA. An identity-verified **different administrator** must recover a lost authenticator; the action revokes sessions and is audited.

| Role | Intended permissions, additionally constrained by department |
| --- | --- |
| Administrator | Accounts, settings, audit, corporate editing; **not** automatic publication or commercial approval |
| Publisher | Independent content review/publication; cannot approve their own authored revision |
| Editor / Marketing | Structured content drafts and editorial assistance; no implicit publishing/pricing power |
| Department manager | Relevant inquiries/quotes/pricing proposals, technical reviews, delivery/resource work |
| Finance | Relevant commercial review/reporting; final quotation/pricing approval only with explicit delegation |
| Operations | Relevant booking/resource/project work; booking/supplier/catalogue approval only with explicit delegation |
| Auditor | Read-only relevant inquiry/quotation/supplier/report/audit evidence; no upload/mutation rights |
| Customer | Verified, individually owned records only, even if also using the customer view of a staff account |

Assign the minimum required departments and management-approved money/discount ceilings. `maxQuotationMinor` is **minor units**, and discount limits are basis points. Administrator access is not a shortcut around independent technical, finance and final reviewers. A second administrator must change an administrator's own privileges. Scope changes/suspension revoke existing sessions. Review access on staff departures, transfers and temporary assignment expiry; automated HR synchronization is not installed.

## 2. Inquiries and follow-up

1. Guests can submit Contact or a service-specific RFQ without registering. Each valid request is saved first with a reference. Main divisions are Events, Catering, **Cleaning**, **ICT**, and Entertainment. Do not interpret a customer's desired date, rate estimate or urgency as availability or an SLA.
2. **Inquiries & follow-ups** lists only records the signed-in staff member is authorized to see. Open a request to review the original text, selected language, notice/consent version, region, preferred/alternative date, self-reported source and division-specific requirements.
3. Events requesting Catering are routed to both. Additional divisions remain one coordinated inquiry; gather any extra requirements before quoting. Detailed intake is based on the primary division plus the conditional Event→Catering assessment, not a separate full form for every additional division.
4. Move `new → in_review` before contacted/closed transitions. Assign an authorized active officer, priority, due date and a concrete next action. Closed CRM follow-up is not the same as an operationally completed booking. Refresh if a version conflict reports a newer edit.
5. Use **Qualification & opportunity outcome** for an actual human assessment. Qualified requires service-fit, minimum-requirements and follow-up-contact checks plus evidence. `won` requires confirmed/delivered work; `lost` cannot contradict active confirmed work. A declined or expired offer does not automatically mean a lost customer opportunity.
6. Review classification assistance, then use the separate correction action with a reason if routing is wrong. Staff need scope over destination divisions; live offers and active bookings lock classification. The original service/text is preserved, and obsolete assignments are cleared.
7. Keep private coordination in **internal notes**. Use customer-visible messages for reviewed information requests and progress. Notifications tell recipients to sign in; no unrestricted confidential attachment links are sent.
8. CSV export applies to authorized visible records and defends against spreadsheet formulas. An export is still private data: store/transmit it under the retention and access policy, not in public Git or a shared link.

A saved form is not lost if SMTP fails. Keep the reference, review **Settings & integrations**/outbox, repair the delivery dependency and allow controlled retry. Do not ask the customer to submit again merely to resend a notification.

## 3. Pricing and quotation lifecycle

1. In **Price books**, a department manager/finance officer proposes a named dated book of rules. Finance with explicit pricing delegation, **different from the author**, reviews it. No live TOC prices have been invented or pre-approved by this project. Publish only rules suitable for the nonbinding public estimator.
2. Prepare a quotation from an authorized inquiry. Choose applicable current approved rate references and quantities or enter an explicitly reasoned manual proposal. The server calculates fixed-point tax/discount totals. Editing a line manually removes its approved-rule provenance. Logistics/staff/transport/regional items can be explicit scoped lines; approval is still mandatory.
3. Review customer-facing scope, terms, validity, included divisions and amounts. The quotation assistant can prepare **unsaved draft scope, missing questions and current rule references**; it cannot choose/approve a price, tax, discount or booking.
4. Submit the immutable version for independent technical review in **every included division**, finance review, then a different delegated final reviewer within current value/discount limits. The author cannot approve their own version, and finance review/final approval cannot be combined by one person. The UI may show unavailable actions; the API rechecks all rules.
5. Explicitly issue only after all reviews. The customer sees issued versions/PDFs, never an internal rejected draft. `TOC-Q-…` identifies the quotation; each immutable version has its own UUID, snapshot and timestamp.
6. Customer acceptance records the **exact current nonexpired version and terms**. Declines/revision requests preserve history. A changed offer becomes a new version; previous issued snapshots are not silently rewritten. If a booking exists, resolve it before issuing a replacement offer.
7. Acceptance does **not** confirm a booking, take a payment or reserve equipment.

## 4. Resources, supplier arrangements and confirmation

Register real, verified resources in **Resource register**: division/category, quantity, owned/hired/partner status, maintenance due, state and internal location/condition. Personnel/vehicles/exclusive equipment should be registered if their availability must be protected. Unregistered resources are not automatically checked or reserved. Public catalogue publication needs delegated operations authority and evidence; public views deliberately hide quantities, personnel, locations, supplier contacts and maintenance details.

Hired/partner resources require a linked, same-division supplier. In **Supplier register**, an authorized proposer records the actual contact and capability/arrangement evidence. A **different delegated operations officer** approves it with dated evidence and an expiry. Edits revoke approval, stale edits conflict, and active allocations restrict edits. Approval must cover the **entire booking or final recurring visit**. Supplier suspension blocks new confirmation and starting previously confirmed work; staff must also review existing commitments and arrange a safe resolution. Suspension does not silently cancel a contract or notify every affected customer automatically.

For an accepted offer:

1. **Prepare booking** with a definite future first start/end, assigned authorized supervisor, delivery team and explicit resource quantities. The editor scopes supervisors/resources to the accepted offer's divisions and enables recurrence only when Cleaning is included. Dates in inputs are the operator's local time; records are stored UTC and displayed with EAT context.
2. A pending booking is **not reserved/committed**. A separately delegated operations officer must verify contract/work authorization, applicable deposit/payment conditions, staffing, resources/transport/suppliers and safety with evidence. For Events/Entertainment also record permits, music/performance rights, electrical safety, rigging/venue restrictions, inspection and competent crew (or documented not-applicable grounds).
3. Confirmation rechecks every included division's authority, exact current accepted offer, resource maintenance/state, full-horizon supplier approval and overlapping confirmed/in-progress capacity in one transaction. Conflicts leave the booking pending. Allocations are conservatively held across the full recurring contract horizon, not only individual two-hour visits.
4. Start work only after confirmation. Resource/supplier conditions are rechecked before starting. No software checkbox replaces a real safety/competence assessment or signed written ICT security authorization.
5. Completion requires **all visits** completed with supervisor review and **all delivery gates** complete with evidence. Cancelled/completed bookings release capacity for subsequent commitments; financial refunds/cancellation terms remain a separate authorized process.

## 5. Cleaning and ICT delivery

**Cleaning:** daily/weekly/monthly recurrence creates up to 52 separate scheduled visits. Month-end recurrence clamps to valid calendar dates. Each visit retains schedule, supervisor/team, agreed checklist, issues, submission/review state and version. Save progress, submit the completed checklist, then the **assigned supervisor** records review. Do not mark a visit complete simply to clear an overdue dashboard. Customer feedback is private after actual service completion; publication as a testimonial needs a separate consented CMS record.

**ICT:** projects use ordered **Discovery → Design → Authorization → Implementation → Testing → Handover → Closure** gates. Record requirements/objectives; reviewed architecture; commercial/work/security authorization; implementation changes; functional/security/acceptance results; documentation/training/support; customer acceptance and outstanding issues. Gates cannot be skipped or silently overwritten. The system requires evidence text; staff are responsible for obtaining and checking the actual documents. Never include passwords, API/private keys, production credentials or unredacted sensitive logs. Use the protected document channel for appropriate diagrams/files.

Internal milestone evidence is separate from the optional **reviewed customer update**. Customer portal/export omits internal team, checklist issues, private documents, operational conditions, supplier details and raw milestone evidence. A public case study is a new, separately approved editorial record, not a switch exposing the internal delivery project.

## 6. Content studio

The CMS manages pages, five services, service packages, menus, projects, clients, testimonials, articles, vacancies, leadership, FAQs, galleries, downloads, home layout, navigation, company data and approved knowledge.

1. Create/select a record. Fill structured English/Kiswahili fields, source reference, scope and relevant metadata. Type/route/department are immutable after creation; make a new item and approved redirect for a URL change.
2. Save a revision; valid drafts can autosave after four seconds. A live item's old published revision remains visible. Use desktop/mobile and both-language previews; draft preview is not public publication.
3. Add suitable bilingual image alt text, mobile/desktop crop, caption, rights/permission evidence and SEO/canonical/social text. Public downloads require a scanned company PDF. Media uploads are private/quarantined until scanning; they cannot be downloaded/published while unscanned or rejected.
4. Submit for review. A **different publisher** checks facts, client/person permissions, media rights and scope before approving. Seeded illustrations are not proof of image rights or real projects. Use factual empty states until evidence exists.
5. Publish immediately or schedule/expire through the approved revision. A supervised worker is still required for reliable background publishing/reminders even though public content reads also process due publication/expiry.
6. Restore an earlier revision as a **new draft**, not by erasing history. Unpublish/archive removes public content and live AI retrieval. Related content/rates for a withdrawn service are excluded. Redirects must target existing published destinations; chains/loops are rejected.

Company phone/location/social/WhatsApp details are centrally editable, but source-derived identity still needs TOC sign-off. The form-notification mailbox remains fixed to the owner's supplied **info@tocinvestment.co.tz**, not a visitor-selected CMS address. Public galleries/design imagery include illustrative material; do not present it as verified TOC work.

## 7. Reports, audit, AI and privacy

- Reports use EAT **inquiry-created cohorts** and authorized divisions. Qualification, response, quotation and booking rates use distinct disclosed denominators. Automated acknowledgement is not a first human response. The source is retained in-platform messages/assessments, not the external mailbox; corrections affect current reviewed outcomes. Quoted/confirmed booking values are not invoiced/received revenue. Invoice/collected metrics remain unavailable.
- **Audit evidence** filters authorized full history by UTC dates, actor, action, target or text before pagination. Reasons and sensitive record changes are private. Preserve records under the approved retention policy; the database is not a tamper-proof third-party archive.
- Public guidance uses published sources/citations and clearly states whether AI was used. An approved provider/key/model and processor/budget review are required for generative work. Do not treat generated copy/translations as factual or legal approval. Budget/provider errors must not block manual inquiry or human workflows.
- Customers can download their owned data and submit access/correction/deletion/retention requests. **Settings & integrations** provides a versioned, identity-attested manual rights-review queue. A responsible human performs any lawful corrections/erasure across database, storage, email and backups, accounts for legal holds, and records evidence before completing the request. No universal automatic erasure/retention engine is installed.
- Payment, messaging and analytics indicators explicitly show unconfigured. A manually verified payment condition is not a payment-provider transaction or receipt.

## 8. Daily operator checks / handover acceptance

Check overdue follow-ups, pending commercial reviews, upcoming visits, quarantined uploads, failed/exhausted notifications, worker freshness, backups and access changes. `npm run ops:check` is private machine-readable monitoring; connect failure alerts to a real operator. Service level targets, on-call coverage, training acceptance, actual recovery and live mailbox/scanner/provider validation are still management/hosting responsibilities.

Record the named operational owner, independent reviewers, delegated ceilings, real escalation contacts, approved policies and training date in the organization's private handover register—not in a public repository. See [operations runbook](OPERATIONS.md), [coverage/open items](BLUEPRINT-COVERAGE.md) and [launch checklist](../LAUNCH-CHECKLIST.md).
