# TOC Website — launch approval checklist

**Current state: working design / inquiry MVP. Keep preview mode enabled.**

## Business and editorial approval

- [ ] TOC approves the legal/display name and the vector interpretation of its logo, or supplies official vector logo files.
- [ ] Verify +255 677 677 703 and +255 755 439 072; confirm the owner-supplied info@tocinvestment.co.tz mailbox and current office location/directions.
- [ ] Reconcile P.O. Box 1249 vs the ambiguous 41217 postal wording. Do not publish either as a verified box until resolved.
- [ ] Verify BRELA, TIN and licence details against current certificates before publishing them.
- [ ] Approve service scope and the wording for entertainment/production. Confirm owned, rented and subcontracted resources without implying all equipment is TOC-owned.
- [ ] Keep proposed cleaning and ICT divisions unpublished until management confirms capability, staffing and coverage.
- [ ] Approve final English and Kiswahili copy and have a fluent reviewer check translations.
- [ ] Approve service inquiry and follow-up procedures, responsible staff and response expectations. No response-time SLA has been invented.

## Media and evidence

- [ ] Replace illustrative photographs with authorized TOC photography or appropriately licensed stock.
- [ ] Verify the commercial publication rights for every asset from the blueprint. Inclusion in a planning document is not a licence to republish.
- [ ] Obtain approval for the generated hero image, or replace it with real approved media.
- [ ] Retain accurate illustrative captions for any image that is not actual TOC project evidence.
- [ ] Add real case studies, client names/logos and testimonials only after verification and permission. None are fabricated in this release.
- [ ] Check social accounts before adding links. No unverified social or WhatsApp account has been added.

## Data protection and security

- [ ] Have the privacy/terms drafts reviewed and approved for the real operation and applicable Tanzanian data-protection requirements.
- [ ] Define controller details, hosting region, retention schedule, deletion and access procedures, processors and incident response.
- [ ] Replace preview credentials and session secret. Never ship `.env.local` or `STAFF-ACCESS.txt` in a public repository.
- [ ] Use HTTPS and ensure staff cookies are secure.
- [ ] Replace single-password access with individual accounts, roles and stronger staff authentication if multiple people will use it.
- [ ] Configure persistent private database storage, filesystem access controls, backup encryption and tested restoration.
- [ ] Add an approved monitoring and alerting service without logging customer form contents.
- [ ] Configure edge/shared rate limits and trusted proxy headers for the production environment.
- [ ] Run dependency review, security tests and authorization tests before launch.
- [ ] Remove synthetic QA submissions before receiving real inquiries.

## Production services and infrastructure

- [ ] Select and approve a domain, hosting plan and operational owner.
- [ ] Use a persistent single Node server for the SQLite MVP, or migrate to PostgreSQL for multi-instance hosting.
- [ ] Set the private `SMTP_PASS` for info@tocinvestment.co.tz on the Node host; confirm `mail.tocinvestment.co.tz:465`, `SMTP_SECURE=true`, and preview mode off at build time/runtime. Never commit the password or expose it through `NEXT_PUBLIC_`.
- [ ] Test contact and quotation notifications in the actual mailbox, every detail/reference, Reply-To, preview suppression, and saved-inbox fallback on SMTP failure. SMTP integration is implemented; live authentication and delivery still need verification. No automatic customer acknowledgement or background retry queue is included.
- [ ] Confirm SPF/DKIM/DMARC with the email host, outbound SMTP access, monitoring/ownership of failures, and retention/deletion rules for email copies.
- [ ] If WhatsApp/SMS is required, configure an approved company-controlled business account and explicit communication rules. The website currently does not send these messages.
- [ ] Connect a publishing CMS if staff-editable public content is required; content is currently managed in source.
- [ ] Plan the customer portal, formal quotations/approvals, booking/resource engine, payment integrations and AI separately. They are not implied by this MVP.
- [ ] Confirm who checks the staff inbox and how customer inquiries become staff-reviewed quotations.
- [ ] Set the approved `NEXT_PUBLIC_SITE_URL`, then switch preview mode off only after approval and rebuild.
- [ ] Verify sitemap, robots, canonical metadata, email/phone links and all production URLs.

## Acceptance checks

- [ ] Desktop, tablet, 320 px mobile and bilingual layouts.
- [ ] Keyboard-only navigation, focus, lightbox, menus and form errors.
- [ ] Contrast and legibility review with the final content and media.
- [ ] A valid service inquiry and contact message persist and receive a unique reference.
- [ ] In production, both forms email info@tocinvestment.co.tz; success accurately distinguishes SMTP acceptance from saved-only/failed notifications without encouraging duplicate submissions.
- [ ] Invalid dates, missing consent, invalid email, excessive payloads and bots are rejected.
- [ ] Anonymous users cannot list or update customer inquiries.
- [ ] A new inquiry cannot bypass initial review.
- [ ] Draft save/resume/clear and summary download work.
- [ ] Real-browser performance and accessibility review on the final production build.
- [ ] Staff training, documented ownership and management sign-off.
