# TOC Investment — Touch of Class

A modern, responsive public website and functional inquiry MVP, built from the **TOC Website Blue Print.docx** found in the user's **TOC WEBSITE** Google Drive folder.

## Included

- Premium red, charcoal and white design with locally hosted fonts and optimized WebP images.
- Homepage, About TOC, service directory, three service-detail pages, filterable gallery, quality-and-care page, Contact, five-step quotation request, draft privacy and terms pages, and a protected staff inbox.
- English and Kiswahili public copy and language switching. The internal staff inbox is English-only.
- Accessible mobile menu, expandable FAQs, gallery keyboard navigation, Escape-to-close and focus management, reduced-motion support, form labels and validation.
- Conditional request questions for event management, catering and related production, opt-in browser draft saving, final customer review, privacy consent, unique inquiry references, downloadable summaries and user-initiated email drafts.
- Server-side validation, body-size limits, honeypot, origin checks, per-instance rate limiting and SQLite persistence.
- Password-protected staff inbox, filters, search, CSV export with spreadsheet-formula protection, validated status transitions and an audit log.
- Unique page metadata, social preview metadata, favicon and production sitemap/robots configuration. Preview indexing is disabled.

## Deliverables and portable preview

- **TOC-Website-Preview.html**: a self-contained, interactive preview with all public pages, fonts, images, English/Kiswahili switching, service discovery, gallery and quotation-form navigation embedded. Open it directly or use Arena’s file viewer. No external assets are required.
- **TOC-Website-Source.zip**: the Next.js source, tests, font licences, deployment guidance, launch checklist and portable preview. Private credentials and customer databases are deliberately excluded.
- **Live website in Arena**: the running Node application supports actual local inquiry persistence and the protected staff inbox. Open it through Arena’s live preview; the sandbox’s direct hostname requires Arena’s traffic authorization and is not a public deployment URL.

The portable HTML has **no backend**. It explains that submission requires the running website, does not transmit form information, and cannot save inquiries or sign in staff. Browser-draft controls are hidden in that portable edition. The full source includes `portable/` and `scripts/export-portable.mjs` to regenerate the HTML:

```bash
npm run export:portable
```

The export is written beside the source folder as `TOC-Website-Preview.html` by default. Keep image-rights and draft-content restrictions in mind if sharing it outside the project team.

## Start locally

Requirements: Node.js 20.9+ (Node 22 LTS recommended) and npm. A C++ toolchain may be needed if the SQLite package cannot use a prebuilt native binary.

```bash
npm ci
cp .env.example .env.local
npm run setup:staff
npm run dev
```

Open http://localhost:3000. The development server binds to `0.0.0.0` and permits the Arena `.e2b.app` preview host.

The setup command generates **unique local credentials**, writes `.env.local`, and creates `STAFF-ACCESS.txt`. There is no default staff password. Keep both files private and outside source control. Visit `/staff` to use the inbox. Restart the server after changing environment variables.

```bash
npm run typecheck
npm test
npm run build
npm start
```

For browser checks:

```bash
npx playwright install chromium
node scripts/browser-check.mjs
```

## Important preview boundaries

**This is a working website and inquiry MVP, not the entire enterprise platform described in the blueprint.**

- In preview mode, forms save to this website's local database. They do **not** automatically email TOC, send SMS/WhatsApp, create a confirmed booking, or issue a priced quotation. The UI explicitly explains this. Use fictional test details.
- The success screen can download a text summary or open an email draft. Sending that email is a separate, user-confirmed action in the user's email app.
- The floating service guide uses preset information. It is **not** live staff chat or an AI model.
- The staff inbox uses a single configured password and signed, eight-hour HTTP-only sessions. It is not enterprise RBAC, individual staff accounts or a full CMS.
- Company and service content is centralized in `lib/content.ts` and edited in source. A publishing CMS is **not** connected.
- There are no payments, customer accounts, customer portal, automatic pricing, contracts, booking engine, equipment inventory, external analytics or AI APIs.

## Source and editorial decisions

The folder contained one document: **TOC Website Blue Print.docx**, approximately 19.5 MB. Its full body was extracted locally (about 255,560 characters). The implementation review covered content governance, source reconciliation, service catalogues, architecture, workflows and the UI/UX appendix.

- Company identity: TOC Investment Company Limited / Touch of Class.
- Brand retained: red, black/charcoal and white; warm neutral surfaces and restrained hospitality accents.
- Core published content: event management and catering. Related entertainment/production is limited to the scope described in the profiles, with explicit staff confirmation for equipment, suppliers and availability.
- Standalone commercial cleaning and ICT are stored as **unpublished proposals** in `lib/content.ts`. Do not publish them until management confirms operational capability.
- No client logos, endorsements, testimonials, project metrics, founding year, certifications, prices or completed case studies were invented. Their sections are intentionally not published.
- Contacts come from the newer-profile values in blueprint section 2.2. They are **not independently verified**. Only the unambiguous general location, Kisasa, Dodoma, is shown. Conflicting postal-box numbers and legal identifiers were withheld.
- No WhatsApp link was added because a company-controlled WhatsApp number was not confirmed.
- The wordmark is a clean vector interpretation of the identity in the blueprint's UI reference. Obtain approval or replace it with the official logo before launch.
- Public copy and Kiswahili translations are editorial drafts for TOC's review.

## Image and font provenance

All imagery in this preview is clearly illustrative, **not evidence of work performed by TOC**.

| Public asset              | Source                                                        |
| ------------------------- | ------------------------------------------------------------- |
| `hero.webp`               | AI-generated ballroom photograph made for this website design |
| `event-management.webp`   | Blueprint embedded `image78.jpeg`                             |
| `catering.webp`           | Blueprint embedded `image74.jpeg`                             |
| `entertainment.webp`      | Blueprint embedded `image70.jpeg`                             |
| `about-catering.webp`     | Blueprint embedded `image71.jpeg`                             |
| `about-detail.webp`       | Blueprint embedded `image77.jpeg`                             |
| `gallery-conference.webp` | Blueprint embedded `image73.jpeg`                             |
| `gallery-gala.webp`       | Blueprint embedded `image90.jpeg`                             |
| `gallery-catering.webp`   | Blueprint embedded `image65.jpeg`                             |
| `gallery-buffet.webp`     | Blueprint embedded `image97.jpeg` (not currently displayed)   |
| `gallery-exhibition.webp` | Blueprint embedded `image80.jpeg`                             |
| `gallery-production.webp` | Blueprint embedded `image79.jpeg`                             |

The source explicitly calls the photographs design references. Their commercial publication rights are **not established**. Replace them with authorized TOC media or appropriately licensed stock before public deployment. The generated hero must also remain clearly illustrative unless replaced.

Manrope and Inter are hosted locally. Their SIL Open Font License texts are included as `public/fonts/MANROPE-OFL.txt` and `public/fonts/INTER-OFL.txt`. Preserve these notices when redistributing the webfonts.

## Data and deployment

- `DATABASE_PATH` defaults to `./data/toc.sqlite`; create and back up a **persistent, private volume**. The `data` directory must never be exposed as a static/public directory.
- SQLite with WAL is suitable for this single-server MVP. Do not deploy this configuration to ephemeral serverless filesystems or run multiple independent application replicas against separate databases. Migrate to managed PostgreSQL for the blueprint's multi-user, multi-instance system.
- Parameterized SQL is used. Request data is displayed through React's escaped text rendering. Inquiry creation and status-change audit entries are transactional.
- Only authenticated staff can read inquiries or update follow-up status. There is no public inquiry lookup endpoint.
- Rate limiting is in memory and per server process. Add a trusted reverse-proxy/WAF or shared rate-limit store for production and configure trusted proxy headers correctly.
- Preserve customer information only for an approved period. Add documented deletion and subject-rights procedures, backups, monitoring, encrypted hosting/storage and incident response before going live.
- Follow-up statuses are `new → in_review → contacted/closed`. A closed inquiry may be reopened to `in_review`. The backend rejects attempts to skip initial review.

## Before launch

Use `LAUNCH-CHECKLIST.md`. Keep `NEXT_PUBLIC_PREVIEW_MODE=true` until the business has approved content, contact information, policies and media. Setting the flag to false does **not** activate email notifications or any other integration.

Set the approved `NEXT_PUBLIC_SITE_URL` and rebuild after final domain approval. Provision HTTPS, persistent storage, backups, new secrets, individual staff authentication, transactional notifications and an agreed operating process before receiving real customer data.
