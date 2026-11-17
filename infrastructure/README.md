# Single-node deployment reference

These are **unapplied examples**, not evidence of a provisioned production host. The owner has not authorized deployment. Select the real domain, host, region, capacity, operator and recovery objectives before applying them. Never use QA fixture credentials or data in production.

## Architecture decision

The blueprint (pp. 83–85, 113, 133–136) recommends a modular monolith and PostgreSQL/headless CMS/private object storage. This repository implements the modules with a custom schema-governed CMS, **SQLite WAL and private local storage**. This is an explicit single-node implementation alternative, not a PostgreSQL/object-storage adapter. There are no hidden third-party CMS accounts to configure.

```text
Browser -- HTTPS --> reviewed reverse proxy/WAF --> one Next.js Node process
                                                    |-- SQLite on private local volume
                                                    |-- private quarantine/document volume
System timer --> bounded worker --------------------+-- SMTP / optional approved AI provider
Local backup tool --> verified private snapshot --> encrypted offsite backup
External monitor --> liveness + private ops check --> operator's approved alert channel
```

Do not put the database on ephemeral/serverless disks, public buckets, NFS or separate replicas. No multi-instance autoscaling is supported by this adapter. Before scaling, implement/test a managed PostgreSQL storage layer, distributed rate limiting and jobs, private object-storage authorization, migration/reconciliation and backup recovery. Do not merely change a connection-string environment variable: no PostgreSQL adapter exists yet.

## Preparation

1. Obtain TOC approval for production data flows, hosting region, content/media, security, privacy and the five division scopes. Complete `LAUNCH-CHECKLIST.md`.
2. Provision a supported Linux host, Node 22 LTS, npm, a dedicated non-login `toc` user, TLS proxy, time synchronization (needed for TOTP), private encrypted local disks and a reviewed malware scanner. Install compiler/Node headers if native SQLite needs building.
3. Use an approved release directory such as `/srv/toc/current`. Install from the reviewed lockfile with `npm ci`, run typecheck/tests/audit and build. Keep development tooling available to the worker CLIs (`tsx` is a dev dependency); do not prune it without replacing the CLI runner with a compiled artifact.
4. Put secrets in `/etc/toc/toc.env`, readable only by the service/operator. Use paths such as `DATABASE_PATH=/var/lib/toc/toc.sqlite` and `PRIVATE_STORAGE_PATH=/var/lib/toc/documents`. Create both as the application user, mode 0700. Never place credentials in command-line arguments, Git, public files or CMS fields.
5. Generate a random ≥32-character `SESSION_SECRET` through a private secret-management process. Back it up separately: it encrypts staff authenticator secrets. Configure the approved bootstrap email and production HTTPS `NEXT_PUBLIC_SITE_URL`.
6. **Initially keep preview on**. Provision an empty production/staging database through the application, then run `npm run setup:accounts` as the service user with the same environment. Store/rotate the private initial credentials; enroll MFA. Use a second administrator and independent publishers/commercial reviewers, with management-approved authority limits.
7. Before accepting real data, replace/approve seeded illustrative assets and source-derived identity details. Use content revisions/independent approval; a seeded “published” design record is not a commercial image licence.

## Build/runtime flag consistency

`NEXT_PUBLIC_PREVIEW_MODE` and `NEXT_PUBLIC_SITE_URL` are public build-time values. Use identical values for build and runtime. Scripts load ignored `.env.local` when present; production should use the controlled environment file and **not an obsolete local preview env file**. After approved activation, build with preview false and restart. Keep previous application code plus a verified pre-migration backup for rollback.

The service examples use `/usr/bin/npm`; adapt it to the host's actual Node installation. Precreate `.next/cache` and ensure the application user can write it if needed. All application/browser calls remain same-origin. `npm start` binds port 3000 to `0.0.0.0`, so firewall it from the public internet and allow only the proxy. Arena's proxied preview is different and must not be put behind an iframe-denying production config.

## Web, timer and proxy examples

- `toc-web.service`: one supervised Node process, restrictive umask and filesystem access.
- `toc-jobs.service` / `toc-jobs.timer`: bounded worker every minute; the next run starts after the previous one exits. It handles scheduled CMS changes, reminders, up to 25 notifications, up to 10 quarantined scans and expired drafts. Tune capacity using measured queue age rather than promising unsupported throughput.
- `nginx.conf.example`: TLS/domain placeholders, no public data directories, trusted proxy header overwrite and independent auth/form rate limits. Save the proxy snippet separately as indicated, substitute the actual domain/certificates, and run `nginx -t` before reload. The example has **not** been installed/tested on a target host.

Install/review unit files using the host's normal change process; enable the job timer only when the configured email/scanner behavior is approved. Preview runs never transmit mail. Check `systemctl status`, `journalctl` and the retained worker history. Do not run an unsupervised shell loop as the production scheduler.

## Integrations and monitoring

- SMTP: `mail.tocinvestment.co.tz:465`, encrypted, server-only password, fixed form-recipient `info@tocinvestment.co.tz`. Verify from this host, including mailbox receipt, Reply-To and DNS authentication. Outbound access here did not establish production connectivity.
- Scanner: set `MALWARE_SCANNER_PATH` to a reviewed absolute executable. The app invokes it with `--no-summary` and the generated file path, without a shell. Exit 0 marks clean, 1 rejects malware, other failures leave quarantine. Confirm the installed scanner's interface/signatures and threat-test it in staging.
- AI: optional approved HTTPS OpenAI-compatible endpoint, key/model, processor/transfer review and budget. No provider is necessary for manual workflows or published-source guidance.
- No automatic payments, SMS/WhatsApp, external visitor analytics, accounting or HR provider is configured. Do not invent provider URLs, webhook signatures or payment success screens.
- Poll `/api/platform/health` for web/database liveness. Run `npm run ops:check` privately for worker freshness, queue age and exhausted attempts; wire nonzero exit to the chosen alerting system. Threshold defaults are examples (10-minute worker age / 30-minute notification age), not a signed SLA. Monitor disk space, CPU/memory, certificate expiry, backups, scanner freshness and 5xx separately.

## Backups, migration and rollback

Run `umask 077` and `npm run backup:verify -- /private/new-snapshot-path` with the live DB/storage environment. The command uses SQLite online backup, validates integrity, copies referenced private files, records hashes, restores to an isolated temp directory and checks record counts/hashes. Encrypt/copy successful snapshots offsite, protect the key/manifest, and enforce a legally approved retention schedule.

Schema upgrades are additive/idempotent in `lib/platform-store.ts`, currently version 7; the application initializes them on first platform access. Test with a **copy** of the current database before a release. Unit tests verify upgrade from an older inquiry database without deleting records or reseeding duplicates.

A failed release does not authorize destructive SQL rollback. Stop web/worker writers, preserve the failed state, restore the chosen verified database and corresponding document set to **new private paths**, restore the matching application version/secrets, validate with SMTP/AI disabled in isolated staging, then atomically switch the service configuration and restart under the approved incident plan. Never copy only a live `.sqlite` file while ignoring WAL, or mix an older DB snapshot with mismatched private files.

An isolated automated restore has been tested. **Actual production restore, offsite recovery, RPO/RTO, uptime and alert delivery remain operational acceptance gates.** See `docs/OPERATIONS.md`.
