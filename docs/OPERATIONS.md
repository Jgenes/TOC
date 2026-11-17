# Operations, security, privacy and recovery runbook

Blueprint references: pp. 10–12, 88, 98, 115, 125–129, 133–144 and 156. These instructions are a handover aid for the nominated operator; **they have not been applied to a production host**. Keep preview mode enabled until the launch checklist is signed. Do not copy credentials, private records or raw diagnostic files into this repository/GitHub issues.

## Operating boundary

- One supported Node 22 LTS instance, Next.js, SQLite WAL, private local document storage. No multi-node/ephemeral/serverless/NFS adapter. The custom CMS is not a hosted third-party headless CMS. See [deployment decision and templates](../infrastructure/README.md).
- Environment configuration is in `.env.example`; real secrets belong in a private environment/secret manager. `NEXT_PUBLIC_*` values are public build-time configuration, never passwords. Application, worker and backup tools must use **the same intended database, storage and encryption secret**.
- Schema version 7 is additive/idempotent on initialization. The old inquiry table/status history is retained. Backup and rehearsal on a copy precede every upgrade; there is no automatic destructive rollback.
- Customer transactions, publication, rate approvals and booking authority are explicit application actions. A successful build/deploy/health response is not business authorization.

## Daily/continuous checks

| Check | How / expected behavior | Escalation |
| --- | --- | --- |
| HTTP/database liveness | `GET /api/platform/health` → 200 `{"status":"ok"}` | Proxy/app/DB process or disk issue; this endpoint does not prove mail/scanning/worker health |
| Worker and notification health | Privately run `npm run ops:check`; nonzero exit / `ok:false` is an alert | Check scheduling, failed/stuck run and outbox; connect output to the approved external monitor |
| Worker freshness | Default maximum 10 minutes; `OPS_MAX_WORKER_AGE_MINUTES` is consumed by the checker | Review timer/service/private logs; a recent successful run does not hide a later failed run |
| Notification backlog | Default maximum pending/retry/sending age 30 minutes; `OPS_MAX_NOTIFICATION_AGE_MINUTES` | Check SMTP/network/credentials/rate of work; counts only, not recipient/body output |
| Exhausted notifications | `noExhaustedNotifications=false` / settings outbox failed state | Investigate first, avoid recreating the business submission; controlled replay requires an approved operator action |
| Quarantine/scanner | Settings worker summary + quarantined file count; verify scanner signatures outside app | No configured/working scanner means no downloads/publication. Do not manually mark a file clean to unblock a customer |
| Follow-ups / expiry | Requests, reports, scheduled worker reminders | Named department officer reviews next action; automated mail is not a human response |
| Capacity / supplier safety | Upcoming bookings, maintenance, expiring/suspended supplier arrangements | Review affected commitments before work, not just new bookings; suspension is not an automatic cancellation/refund |
| Backup / restore | Success manifest, offsite encrypted copy, scheduled isolated recovery exercise | A stale/missing backup is an incident; negotiate/record actual RPO/RTO |
| Host health | Disk (DB/WAL/storage/backups), memory/CPU, TLS expiry, clock sync, OS/dependency patches | Approved host/operator monitor; these metrics are not all collected by application code |
| Access/content review | Departures, delegation changes, approvals/withdrawals and audit filters | Minimum necessary roles/scope; second-person account recovery and factual/rights review |

`ops:check` opens the database **read-only**, refuses to create a missing file and emits only booleans/counts/timestamp. Missing schema/worker, invalid timestamps, future clock errors, stale jobs/queue and exhausted mail fail closed. It never emits recipient, payload, actor, document or secret-path data. Thresholds must be positive minutes. The host must send alerts to a real operator—no alert destination/on-call service has been configured.

## Background jobs

Run `npm run jobs:run` every minute via the provided reviewed system timer or equivalent supervised scheduler. Its bounded sequence is:

1. Due approved CMS publication and expiry.
2. Deduplicated overdue follow-up, quotation expiry and optional customer reminders.
3. At most 25 notifications.
4. At most 10 quarantined file scans.
5. Expired account-draft purge, plus persisted worker outcome/summary.

Use one scheduled worker per database; durable leases protect concurrent mail consumers but do not make all business jobs a distributed queue. A manual **Run background work** action is restricted/audited and is not a substitute for the scheduler. Public content retrieval also processes due publication/expiry so withdrawn content does not remain accessible between timer ticks.

### Mail delivery troubleshooting

Fixed staff form-recipient: **info@tocinvestment.co.tz**. Supplied server: **mail.tocinvestment.co.tz**, port **465**, implicit TLS/certificate verification, authenticated mailbox in From; customer in Reply-To. The real password is **not supplied/verified here**. IMAP/POP3 are unnecessary for sending.

Public intake saves the inquiry/work/claim/acknowledgement/staff outbox in one transaction, then attempts immediate staff delivery with a lease. Worker delivery uses stable deterministic Message-IDs, stored Reply-To, bounded exponential backoff and a maximum of five attempts. Interrupted leases are recoverable. Delivery is **at least once**: an SMTP-accepted message may repeat if acceptance was lost before bookkeeping. Do not promise exactly once or use a notification as a legal receipt.

| State | Meaning / action |
| --- | --- |
| `preview` | Intentionally not transmitted; do not replay training data into live mail |
| `pending` | Awaiting credentials/worker/due time; check missing SMTP password and scheduler |
| `sending` | Leased attempt; don't manually send another copy while a worker is active |
| `retry` | Attempt failed safely; inspect dependency and next attempt, not customer resubmission |
| `sent` | SMTP accepted; verify actual mailbox/spam placement independently |
| `failed` | Attempts exhausted or exhausted interrupted lease; operator assessment required |

Preview suppression also applies when credentials exist. Correct a secret only through the host's private configuration. Never expose raw SMTP errors/credentials or form bodies in logs. Check TLS/DNS/outbound policy and mailbox authentication; verify SPF/DKIM/DMARC and real receipt with the email host. If a worker/process fails between SMTP acceptance and state recording, retain the existing inquiry/reference, expect potential duplicate notification and reconcile rather than creating a duplicate business record. There is no public “force sent” endpoint or automatic external-mailbox reply importer.

## Private documents and malware

Uploads are streamed with a 5 MiB limit, filename normalization, signature allowlist (PDF/JPEG/PNG/WebP/plain text), generated UUID storage keys, SHA-256, private visibility and quarantine. Images are decoded with a 40-million-pixel bound, stripped/re-encoded as WebP. These controls reduce risk but are not a full malware sandbox or DLP system.

`MALWARE_SCANNER_PATH` must be an absolute reviewed executable. The worker invokes it **without a shell**, passing `--no-summary` and a generated storage path, timeout 30 seconds. Exit 0 = clean; 1 = rejected; errors/other statuses remain quarantined. Confirm the installed scanner's behavior and current signatures with safe staging tests. Customer access requires ownership/customer visibility **and** a clean scan/checksum; company/public files require editorial scope and a currently published reference. PDFs/downloads do not expose arbitrary filesystem paths.

For suspect content, preserve private audit/metadata and isolate the file under the incident policy. Rejected files are not automatically erased; lawful retention/disposal is a human-controlled operational task. Never copy them into `public/` or bypass the gate with SQL.

## Accounts, secrets and recovery

- Use individual verified accounts + staff TOTP, not the preview shared password. Bootstrap privately once (`npm run setup:accounts`); mode-0600 access file is ignored and must be rotated/secured. Never use synthetic fixture identities in production.
- Keep at least two separately controlled administrators, independent publishers and commercial reviewers. Role changes/suspension/password reset revoke relevant sessions; commercial delegation remains separate from administrator status.
- Lost password: enumeration-resistant reset request, one-hour one-use hashed token. The account still needs MFA. Lost TOTP: a **different administrator** verifies identity, records evidence, resets MFA and revokes sessions. Never reset your own authenticator or accept an unverified chat request.
- `SESSION_SECRET` encrypts TOTP secrets with AES-GCM and protects legacy preview signatures. Losing/changing it is **not transparent key rotation**: existing TOTP ciphertext cannot be decrypted with a new key. Back up secrets separately; planned rotation requires a tested re-enrollment/recovery plan. Session tokens themselves are random and stored hashed.
- SMTP/AI keys are server-only. Rotate after suspected compromise, revoke affected sessions/invitations as appropriate, review relevant audit scope, and confirm pending delivery/jobs after recovery. Do not publish a token in a PR or screenshot to prove it works.
- Production HTTPS, trusted proxy headers, edge rate limits, time sync, encrypted disks and secured OS/service accounts are hosting responsibilities. Production CSP/HSTS/alerting require host-specific testing and are **not automatically enforced by the example template**. The Arena iframe preview must continue to be allowed; production proxy policy is a separate configuration.

## Backup, verification and safe rollback

```bash
umask 077
# Use the intended private DATABASE_PATH and PRIVATE_STORAGE_PATH environment.
npm run backup:verify -- /private/new-snapshot-directory
```

The tool uses SQLite's online backup, checks integrity, copies referenced private files and validates hashes, writes a private manifest, restores to an isolated temporary directory and verifies integrity/counts/hashes. It refuses an existing completed manifest. Snapshot contents are **sensitive**, even if all code is public. It does not automatically encrypt, upload offsite, expire old snapshots, restore a host or recover secrets. Protect the parent directory and run as the restricted service/operator user.

Before deployment: verify an existing snapshot, take a fresh snapshot, test upgrade on a copy and verify staff/customer workflows with outbound mail/AI disabled. Preserve the old release and matching environment/secret version.

If a rollback is needed, stop web/worker writers, preserve the failed state for investigation, restore a chosen verified DB + matching documents to **new private paths** and select the matching application version. Validate in isolation first (no real mail/provider), then switch the approved service configuration and resume with audit/queue reconciliation. Do not overwrite a live database, copy only a `.sqlite` file while ignoring WAL, mix snapshots, replay preview outbox messages into live mail or attempt an unreviewed schema downgrade.

Automated tests have exercised a representative isolated DB/document restoration and additive legacy upgrade. **Production/offsite recovery, encrypted backup access, actual restore timings, alert receipt and RPO/RTO still require an operator-signed rehearsal.**

## Privacy / retention / rights

The privacy/terms copy is a reviewable draft, not a legal opinion or PDPA compliance certificate. TOC must approve controller/contact details, purposes/lawful bases, retention by record type, legal holds, processors/subprocessors, hosting/transfer locations, breach escalation and contracts before live data collection.

Implemented controls: purpose/notice/selected-language metadata; explicit RFQ review/consent; bounded/minimized fields; scoped private data; distinct public projections; 7-day device drafts (opt-in, consent cleared) and 30-day owned account drafts; private customer export; versioned manual access/correction/deletion/retention requests with independent identity-attested staff resolution evidence. Database drafts are purged by the worker; device expiry is handled on use. These do not constitute automatic erasure of all business/email/backups.

For a rights request:

1. Use the assigned private queue; verify identity via an approved separate method without collecting excessive new identifiers.
2. Assess scope, legal obligations/holds and relevant organization authority; record a reasoned decision and due date through the real operating procedure.
3. Obtain any necessary authorized export/correction/disposal from DB, private documents, mailbox, processors and backups under the policy. There is **no general erasure executor** or automatic email/backup purge in this code.
4. Retain only lawful minimal completion evidence; send the response securely. Mark fulfilled only after the responsible human has performed and verified the action, not merely because the UI allows a resolution.

Do not enable analytics/marketing trackers, AI transfers, messaging or payments until their providers/data flows/consents/contracts are approved. Payment/messaging/analytics flags accurately remain false. Dietary text may be sensitive; ask only relevant requirements, never medical files. ICT customers must not submit credentials or unrestricted production logs.

## Incident response (operator-approved policy required)

Contain the affected route/account/provider, preserve private audit evidence, identify affected data/commitments, rotate compromised secrets and revoke sessions as needed, notify the designated TOC privacy/security lead, assess applicable notifications and restore from verified clean state. Record the incident in a private system; publish only a sanitized request ID/technical reproduction in GitHub. Do not send raw customer data or secrets to a third-party debugging/AI service.

No penetration-test certification, legal sign-off, 24/7 service, live alert channel, production recovery or provider health is implied by the local test results. See [QA evidence](../QA-RESULTS.md) and [coverage limitations](BLUEPRINT-COVERAGE.md).
