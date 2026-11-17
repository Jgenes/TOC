# TOC website — verification summary

## SMTP integration update — 17 November 2026

- Clean locked dependency installation, TypeScript checking and formatting: passed.
- `npm test`: **28 passed**, including email contents, fixed recipients, Reply-To/header safety, strict TLS settings, preview suppression, missing/invalid credentials, rejected recipients, safe logs, both API form origins, save-before-send ordering and persistence on SMTP failure.
- Optimized Next.js builds with preview mode **on and off**: passed.
- Production-build end-to-end SMTP smoke test: both forms successfully authenticated and sent all details/reference to a **local TLS-encrypted SMTP capture server** with a trusted test certificate. The test sink never forwarded email. With the SMTP sink unavailable, the API returned `201`, `email_failed` and a persisted reference rather than losing the inquiry or reporting a storage failure.
- Full `scripts/browser-check.mjs` preview regression suite rerun: passed, including the 12 public routes at four widths, bilingual layouts, both forms, protected inbox/workflow, security checks, zero browser runtime errors and zero automated accessibility violations in audited states. Repeated auditing exposed undersized quotation-review Edit buttons; an explicit 32 px minimum height fixes their hit targets. The audit helper now waits for fonts and scrolling to settle so smooth-focus scrolling is not mistaken for fixed-header obstruction.
- `scripts/email-browser-check.mjs`: **8 form/status combinations passed** (contact and quotation × preview, SMTP accepted, SMTP failed and saved-only), including English/Kiswahili copy, correct mailbox links, no duplicate POSTs, 320 px layouts and automated WCAG A/AA checks. Responses are intercepted; this test does not send email or save inquiries.
- Portable export compilation and smoke check: passed; the official contact address is included and server-side SMTP code/secret settings are not bundled into the HTML. The original offline-interaction audit below was not repeated for this change.
- Production dependency audit: **0 reported advisories** at check time.
- Only synthetic data was used. Temporary TLS credentials and the SMTP smoke-test database were removed; the full browser suite removed its own inquiry/audit records. No mailbox password was stored in source control.

**Still required:** configure the real mailbox password privately on the Node host, disable preview mode at build/runtime after launch approval, rebuild/restart, and verify actual receipt/spam placement and domain authentication with the TOC email host. These tests do **not** verify authentication against `mail.tocinvestment.co.tz` or delivery into the real TOC mailbox. Automatic customer acknowledgements and background email retries are not implemented.

## Original preview verification — 16 November 2026

**Date:** 16 November 2026  
**Build:** Next.js production build, preview configuration  
**Result:** All implemented checks passed. This is not a production-readiness certification.

## Automated and browser checks

- TypeScript type checking: passed.
- Unit tests: **11 passed** (request validation, consent, date validity, body fields, workflow transitions, password/session verification and tampering/expiration).
- Production compilation and prerendering: passed, no build warnings in the final build.
- npm audit of production dependencies: **0 reported advisories** at the time of the final check. This is a point-in-time package audit, not a security guarantee.
- **12 public routes at 1440, 768, 390 and 320 pixels**: one H1 per page, no detected horizontal overflow, no detected broken loaded images.
- English/Kiswahili switch, persistence and ten Kiswahili mobile page layouts: passed.
- Mobile navigation open, selection and close: passed.
- Gallery category filtering, image navigation, Escape dismissal and focus restoration: passed.
- Preset service guide: passed, including clear non-AI/non-live-chat disclosure.
- Five-step catering inquiry: selection validation, requirements, draft save/resume, conditional preferences, contact validation, customer review, mandatory consent, saved reference and summary download: passed.
- Contact form: saved a separate inquiry; optional phone can be omitted.
- Protected staff inbox: unauthorized access rejected; login, record display, search, valid status updates, CSV export and logout: passed.
- Server rejects attempts to skip initial inquiry review: passed.
- Server rejects unapproved service slugs, missing consent, excessive body size, cross-site Origin and excessive requests: passed.
- Proposed ICT route remains 404; preview robots file disallows indexing: passed.
- Browser runtime exceptions during the final full test: **0**.

## Automated accessibility review

Axe WCAG A/AA checks reported **no violations in the nine audited production-build states**: homepage, contact, gallery, initial quotation form, requirements, catering preferences, final review, success and authenticated staff inbox.

This does not prove complete WCAG conformance. A human keyboard, screen-reader, contrast, content and final-media review remains required before launch.

## Portable preview

The self-contained HTML was tested inside an opaque-origin iframe with `sandbox="allow-scripts"`, matching the restricted document-viewer model. Navigation, language switching, gallery filtering/lightbox and offline submission messaging worked. The test observed **zero external network requests** and **zero JavaScript runtime exceptions**.

## Test data

Only synthetic names, `.test` email addresses and fictional requirements were used. The final browser test removed its own two synthetic inquiry records and associated audit rows. The database was checked afterward and contained **zero inquiries** and **zero audit rows**.

## Not verified / not delivered as completed enterprise features

- Actual TOC mailbox authentication/receipt has not been verified; the SMTP implementation and local testing are described in the update above. SMS, WhatsApp, payment and external AI delivery are not connected.
- Company contacts, image publication rights and management approval are outstanding.
- No enterprise CMS, customer portal, individual staff roles, automatic quotation pricing, booking/resource engine or payment integration is represented as implemented.
- Hosting resilience, final domain, real-user performance, legal compliance, formal penetration testing, backup restoration and production operational ownership require launch work.

See `LAUNCH-CHECKLIST.md` and `README.md` for the release boundary and handover requirements.
