# Design-system and screen handover

Blueprint pp. 25–37, 38–49, 145–159. **Deliverable:** editable React components, CSS tokens, structured CMS schemas, repeatable browser checks and a standalone public HTML design preview. This is **not** an official TOC brand manual, Figma/Adobe source file, signed usability study or WCAG/performance certificate. Final artwork/palette, media rights, business content, fluent translations and management approval remain open.

## Direction and implemented tokens

The public experience is a corporate/service website, not a generic SaaS dashboard. A restrained red/ink/cream palette, large editorial headings, service photography/illustrations and clear consultation/RFQ actions lead into separate protected workspaces. The five divisions have distinct content but one shared identity.

| Token / rule | Current implementation | Review boundary |
| --- | --- | --- |
| Primary red | `--red: #c91f2a` | Accessible implementation interpretation; not a claim that this is TOC's official approved color |
| Brighter accent | `--red-bright: #e32633` | Decorative emphasis; verify contrast for each actual use |
| Ink / secondary text | `--ink: #1c1c1c`, `--muted: #6d6c6a` | Final content/contrast review still needed |
| Borders / background | `--line: #e8e6e2`, `--cream: #f6f5f1`, `--white: #fff` | Shared public surfaces/cards/forms |
| Heading / body | Locally hosted Manrope / Inter with system fallbacks | OFL notices retained in `public/fonts/`; no external font requests |
| Base type | Body 15px / 1.7; desktop H1 64px, H2 43px, H3 22px with responsive overrides | Defined in `app/globals.css`; private scale in `app/platform.css` |
| Corner radius | `--radius: 5px`, component-specific controls/cards | Not an external design-library dependency |
| Responsive | Shared containers and service grids; major public overrides around 900/700/390px; private mobile sidebar/table overflow handling | Tested public widths 1440/768/390/320 and private desktop/320 |
| Motion | Reduced-motion override disables nonessential transitions/animation/smooth scrolling | Avoid adding autoplay/background video or motion-only state |
| Focus | Visible focus ring, skip link, explicit field associations, keyboard drawer/lightbox behavior | Manual assistive-tech audit remains a launch gate |

The source of truth is the versioned CSS/component code, not the numbers in this document if code later changes. Do not replace original customer text with interface translations. Supported public/CMS content is bilingual; source-language business records and some technical/diagnostic text remain unchanged. There are no distinct locale URLs/hreflang outputs yet.

## Component inventory / editing ownership

| Component family | Source | Responsibility |
| --- | --- | --- |
| Provider/public shell/logo/header/nav/footer | `components/site-shell.tsx` | Shared identity, EN/SW selection, CMS-driven published catalogue/contact/navigation, touch/keyboard navigation |
| Hero/about/service/detail/gallery/contact/legal | `components/pages.tsx` | Public compositions and safe empty/illustrative states |
| Listings/details/catalogue/assistant | `components/public-content.tsx` | Approved projects/news/clients/careers/documents/team/menu/package/FAQ and public guide |
| RFQ/contact and receipts | `components/request-form.tsx` | Conditional service validation, customer review/consent, drafts, final reference/status/download |
| Nonbinding estimator | `components/estimate-planner.tsx` | Current server-approved options, server calculation, never booking/offer authority |
| Protected shell | `components/platform-app.tsx` | Capability-aware 18-section staff / eight-section customer navigation |
| Identity | `components/platform-account.tsx` | Login/register/verify/reset/claim and staff MFA |
| Shared private controls | `components/platform-shared.tsx` | Explicit labels/hints, actions/loading/errors, tables/badges/empty/notice states, structured fields |
| CRM/commercial/content/delivery/management | `components/platform-*.tsx` | Version-aware scoped business forms, independent approvals, staff/customer projections |
| Editorial interface translation | `lib/platform-copy.ts`, `components/workspace-text.tsx` | Fixed EN/SW interface copy, not automatic mutation of record text |
| Content/data schemas | `lib/platform-cms.ts`, `lib/service-fields.ts`, `lib/inquiry.ts` | Supported CMS fields, service conditional behavior and validation contract |

Layouts reuse these components; do not fork a separate Cleaning/ICT application or bypass protected data boundaries for a public case study.

## Screen / route inventory

### Public

- `/`: hero → service discovery → About/differentiators → approved projects/process/gallery/clients/testimonials/news → contact. Sections/sequence are governed by the home content record; Services and Contact cannot be removed. Empty evidence sections are intentional.
- `/about`, `/about/leadership`, `/quality-and-safety` (plus `/about/quality-and-safety` alias).
- `/services` and five details: `event-management`, `catering`, `general-cleaning`, `ict-solutions`, `entertainment`. `/services/cleaning` and `/services/ict` are aliases.
- `/projects`, `/projects/[slug]`, `/clients`, `/news`, `/news/[slug]`, `/careers`, `/opportunities`, `/downloads`, `/gallery`.
- `/contact`, `/request-quotation?service=…`, `/privacy` (alias `/privacy-policy`), `/terms`.
- Governed published editorial `/[slug]` pages, excluding reserved functional/private routes. Unknown/unpublished records return a real 404; approved old slugs can redirect permanently.

### RFQ: six journey states, not six separate HTML pages

1. **Service** — choose a published primary service or guidance.
2. **Requirements** — service-specific assessment, region/location, date/TBC/alternative, attendance where relevant. Event Catering is conditional. Detailed additional-division assessment remains staff follow-up rather than a full separate form for every additional service.
3. **Preferences** — relevant requirements, optional estimate, additional coordinated divisions, style/dietary/budget/details. Prices are never hardcoded client authority.
4. **Contact** — name/organization/email/telephone and validation.
5. **Review** — all entered data, edit links, explicit notice/consent and submit. Incomplete drafts cannot pre-record consent.
6. **Receipt** — saved unique reference, truthful preview/saved-only/SMTP-accepted/failed notification status, summary download and secure claiming. An inquiry/estimate is never presented as a confirmed booking.

Seven-day opt-in device draft and owned 30-day account draft controls are separate. Files exchange happens through the protected post-inquiry channel, not anonymous public attachment delivery. No live payment screen/provider is fabricated.

### Identity

`/portal/login`, `/portal/register`, `/portal/verify`, `/portal/forgot`, `/portal/reset`, `/portal/claim`; staff sign-in at `/admin` or `/admin/login` plus pending-MFA setup/verification states. Error/expired/used token and email enumeration-resistant messages are defined. Production `/staff` redirects to individual-account administration; its retained old inbox is preview-only.

### Customer portal — eight screens

`dashboard`, `requests`, `quotations`, `bookings`, `projects`, `documents`, `messages`, `profile` under `/portal`. Customer quotation details include scope/items/tax/discount/validity/terms/PDF and exact-version accept/decline; no internal drafting/approval evidence. Projects expose ordered milestone labels/status/timestamps and reviewed public updates, not private notes/team/evidence. Profile includes password security, owned export and manual data-rights requests. No shared organization-membership access is implemented.

### Staff — 18 capability-gated sections

Under `/admin`: `dashboard`, `requests`, `content`, `quotations`, `bookings`, `projects`, `visits`, `documents`, `messages`, `resources`, `suppliers`, `pricing`, `users`, `reports`, `assistant`, `audit`, `settings`, `profile`.

Only permitted capabilities appear; scope and authority remain independently checked by the API. Screens include list/detail/action states, not just navigation placeholders. CMS provides structured fields, autosave, bilingual desktop/mobile preview, source/permission metadata, independent review, scheduling, revisions and restoration. Resources/supplier arrangements, Cleaning visits, ICT gates, human qualification and filtered full-history audit are real persistent workflows, not illustrative KPI cards.

## Shared state specification

| State | Required behavior / example |
| --- | --- |
| Loading | Visible protected-workspace/action progress; avoid misleading fake data while requests load |
| Empty | Explain lack of approved projects/clients/offers/visits and offer the relevant next action; do not invent records |
| Validation error | Associate field/hint/error by ID, focus first relevant field or return to the correct RFQ step, retain entries |
| Request/network error | Truthful retry explanation; do not claim saved/emailed/paid/booked without a server result |
| Unauthorized/forbidden | Identity/MFA entry or readable denial; menus are not the security boundary |
| Conflict | Preserve previous records, explain refresh/version/resource conflict; never blind-overwrite a newer edit |
| Draft / pending review | Explicitly distinguish saved draft from live content, issued offer or confirmed booking |
| Preview/offline | Preview never sends real mail; standalone HTML cannot authenticate, submit, publish or access server data |
| Saved notification failure | Keep the persisted reference; explain mail status without asking for duplicate submission |
| Quarantined/rejected file | No download/publication until clean scan/checksum; protected metadata only |
| Unavailable dependency | Rules-based guidance/manual flow where safe; generative editorial tools show disabled/unavailable, not fabricated results |
| Accepted/pending/confirmed | Exact offer acceptance, pending operational review and committed booking are distinct states |

## Media, crop and SEO handover

CMS home/service/generic records support bilingual alternative text, caption, desktop/mobile image position, rights/evidence and SEO/canonical/social fields. Approved uploaded assets are private until clean scanning/publication references permit public access. Video is an approved external link, not a tracking/autoplay embed. Public project records are separate from internal delivery records.

The generated ballroom/Cleaning/ICT artwork and design-reference gallery/photos are **illustrative**. Document inclusion does not establish commercial publication rights. Keep captions honest and replace/approve source assets before launch. No real clients/projects/testimonials/prices/equipment quantities have been invented.

Metadata/sitemap are server generated from supported published fields, but default English/static fallback and locale-specific SEO work remain. Keep preview noindex. Use the approved HTTPS final origin at build/runtime only after launch authorization.

## Portable design preview

`npm run export:portable` writes ignored `research/TOC-Website-Preview.html`. It embeds public source design pages, images/fonts/scripts and language switching. It is not a CMS database export or a deployment: no protected data, actual saved submissions, functioning account login, real estimator or email/provider secrets. Protected routes clearly explain the boundary and draft/estimator controls are hidden.

`npm run test:portable` exercises the export inside an **opaque-origin `sandbox="allow-scripts"` iframe**, including navigation, both languages, desktop/mobile images/layout, gallery/focus, ICT/Cleaning deep links and truthful offline form failure with retained synthetic entries and zero network requests. Browser prerequisites match the main QA suite. The compatibility layer is confined to `portable/`; it uses Web Crypto randomness when secure-context-only UUID generation is unavailable. No real endpoint is called by the standalone file.

## Acceptance still required

- Official logo/brand/color/type approval and final rights-cleared media/content.
- Fluent bilingual/editorial/legal review, including remaining source-language diagnostics/SEO.
- Keyboard, screen-reader, contrast, zoom/reflow, reduced-motion and full WCAG 2.2 AA audit with final content; sampled Axe is not certification.
- Real phone/tablet/constrained network usability and p75 performance targets; no production RUM evidence exists.
- Staff/customer task-based UAT, training and signed handover, independent security/recovery/provider/host validation.
- A separate Figma/Adobe source design file if explicitly commissioned; it is not silently represented as delivered by React/CSS/HTML.

Refer to [coverage/open items](BLUEPRINT-COVERAGE.md), [QA evidence](../QA-RESULTS.md) and [launch checklist](../LAUNCH-CHECKLIST.md) rather than treating this specification as proof that every gate has been accepted.
