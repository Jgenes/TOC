# TOC website — verification summary

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

- No actual TOC email, SMS, WhatsApp, payment or external AI delivery was tested or connected.
- Company contacts, image publication rights and management approval are outstanding.
- No enterprise CMS, customer portal, individual staff roles, automatic quotation pricing, booking/resource engine or payment integration is represented as implemented.
- Hosting resilience, final domain, real-user performance, legal compliance, formal penetration testing, backup restoration and production operational ownership require launch work.

See `LAUNCH-CHECKLIST.md` and `README.md` for the release boundary and handover requirements.
