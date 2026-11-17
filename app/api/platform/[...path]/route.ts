import { NextRequest, NextResponse } from "next/server";
import { randomBytes, randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { platformInputs } from "@/lib/platform-api-schema";
import {
  rateLimit,
  readJsonLimited,
  safeOrigin,
  privateHeaders,
} from "@/lib/security";
import { company, isPreview } from "@/lib/content";
import {
  ACCOUNT_COOKIE,
  authorize,
  beginMfa,
  createAccountSession,
  createUser,
  hashToken,
  hasPermission,
  issueToken,
  loginAccount,
  passwordHash,
  publicUser,
  requireUser,
  resetAccountPassword,
  roleUpdateSchema,
  sessionUser,
  setAccountCookie,
  updateAccess,
  userInput,
  verifyAccountEmail,
  verifyMfa,
  verifyPassword,
  type Principal,
} from "@/lib/platform-auth";
import { audit, demand, platformDb, PlatformError } from "@/lib/platform-store";
import {
  changePublication,
  contentHistory,
  listContent,
  publicBundle,
  publishedContent,
  publishSchema,
  saveContent,
  saveContentSchema,
  runPublishingJobs,
} from "@/lib/platform-cms";
import {
  acceptQuotation,
  acceptSchema,
  declineQuotation,
  accessibleInquiries,
  actOnQuotation,
  approvePriceBook,
  assignInquiry,
  assignmentSchema,
  calculateQuote,
  claimInquiry,
  classificationSchema,
  correctClassification,
  createPriceBook,
  createQuotation,
  inquiryById,
  inquiryDepartments,
  inquiryMessages,
  messageSchema,
  postMessage,
  priceBookSchema,
  publicPricing,
  resolvePublicPriceSelections,
  quoteActionSchema,
  quoteSchema,
  requireInquiry,
  workFor,
} from "@/lib/platform-business";
import {
  actOnBooking,
  bookingActionSchema,
  bookingSchema,
  completeMilestone,
  createBooking,
  milestoneSchema,
  operationalRecords,
  operationalReport,
  publicResourceCatalogue,
  reportFilters,
  saveResource,
  updateVisit,
  visitSchema,
} from "@/lib/platform-operations";
import { listQuotations } from "@/lib/platform-business";
import {
  applicationUrl,
  processNotificationOutbox,
  queueMail,
} from "@/lib/platform-mail";
import {
  downloadDocument,
  publicDocument,
  listDocuments,
  listCompanyDocuments,
  scanQuarantinedDocuments,
  uploadDocument,
} from "@/lib/platform-documents";
import { quotationPdf } from "@/lib/quotation-pdf";
import { aiConfigured, aiInput, runAi } from "@/lib/platform-ai";
import { assessInquiry, assessmentSchema } from "@/lib/platform-crm";
import {
  listSuppliers,
  saveSupplier,
  actOnSupplier,
  supplierActionSchema,
} from "@/lib/platform-suppliers";
import { listAuditEvents, auditFilters } from "@/lib/platform-audit";
import {
  operationalSettings,
  saveOperationalSettings,
  runBackgroundJobs,
} from "@/lib/platform-jobs";

import {
  accountDraft,
  saveAccountDraft,
  saveDraftSchema,
  deleteAccountDraft,
} from "@/lib/platform-drafts";
import {
  privacyRequests,
  createPrivacyRequest,
  privacyRequestSchema,
  resolvePrivacyRequest,
  privacyActionSchema,
} from "@/lib/platform-privacy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: privateHeaders });
function customerView(user: Principal): Principal {
  return { ...user, roles: ["customer"], departments: [], authority: {} };
}
function customerWork(work: ReturnType<typeof workFor>) {
  return {
    inquiry_id: work.inquiry_id,
    customer_id: work.customer_id,
    department: work.department,
    assigned_to: null,
    priority: "normal",
    next_action: "The TOC team will confirm the next steps.",
    due_at: null,
    version: work.version,
    updated_at: work.updated_at,
  };
}
function pickFields(value: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(
    keys.filter((key) => key in value).map((key) => [key, value[key]]),
  );
}
function customerQuote(row: ReturnType<typeof listQuotations>[number]) {
  const snapshot = row.snapshot as Record<string, unknown>;
  return {
    ...pickFields(row as unknown as Record<string, unknown>, [
      "id",
      "quotation_id",
      "reference",
      "inquiry_id",
      "version",
      "current_version",
      "status",
      "issued_at",
      "accepted_at",
      "acceptance_terms",
      "created_at",
    ]),
    snapshot: {
      ...pickFields(snapshot, [
        "currency",
        "scope",
        "terms",
        "expiresOn",
        "company",
        "customer",
        "inquiryReference",
        "departments",
        "createdAt",
        "discountBps",
        "subtotalMinor",
        "taxMinor",
        "discountMinor",
        "totalMinor",
      ]),
      items: (snapshot.items as Record<string, unknown>[]).map((item) =>
        pickFields(item, [
          "description",
          "quantity",
          "unit",
          "unitPrice",
          "taxBps",
          "taxInclusive",
          "department",
          "unitMinor",
          "quantityMilli",
          "netMinor",
          "taxMinor",
          "totalMinor",
          "discountMinor",
        ]),
      ),
    },
  };
}
function customerOperations(operations: ReturnType<typeof operationalRecords>) {
  return {
    bookings: operations.bookings.map((row) =>
      pickFields(row as unknown as Record<string, unknown>, [
        "id",
        "reference",
        "quotation_version_id",
        "inquiry_id",
        "status",
        "starts_at",
        "ends_at",
        "version",
        "created_at",
      ]),
    ),
    visits: operations.visits.map((row) =>
      pickFields(row as unknown as Record<string, unknown>, [
        "id",
        "booking_id",
        "starts_at",
        "checklist",
        "status",
        "completed_at",
        "version",
      ]),
    ),
    projects: operations.projects.map((row) => ({
      ...pickFields(row as unknown as Record<string, unknown>, [
        "id",
        "booking_id",
        "inquiry_id",
        "title",
        "department",
        "version",
        "created_at",
      ]),
      milestones: row.milestones.map((milestone: Record<string, unknown>) =>
        pickFields(milestone, [
          "label",
          "complete",
          "completedAt",
          "publicUpdate",
        ]),
      ),
    })),
  };
}
function staffDirectory() {
  return (
    platformDb()
      .prepare(
        "SELECT id,name,roles,departments FROM platform_users WHERE state='active'",
      )
      .all() as {
      id: string;
      name: string;
      roles: string;
      departments: string;
    }[]
  )
    .filter((row) =>
      JSON.parse(row.roles).some((role: string) => role !== "customer"),
    )
    .map((row) => ({
      ...row,
      roles: JSON.parse(row.roles),
      departments: JSON.parse(row.departments),
    }));
}
async function handle(request: NextRequest, context: Context) {
  const { path } = await context.params,
    route = path.join("/"),
    method = request.method;
  if (method !== "GET")
    demand(safeOrigin(request), 403, "Request origin is not permitted.");
  if (method !== "GET")
    demand(
      rateLimit(
        request,
        route.startsWith("auth/") ? "accounts" : "platform-mutations",
        route.startsWith("auth/") ? 30 : 100,
        15 * 60 * 1000,
      ),
      429,
      "Too many requests. Please wait and try again.",
    );
  const db = platformDb();
  if (method === "GET") {
    if (
      (path[0] === "public-documents" || path[0] === "public-media") &&
      path.length === 2
    ) {
      const media = path[0] === "public-media",
        file = publicDocument(path[1], media);
      return new NextResponse(new Uint8Array(file.bytes), {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": file.mime,
          "Content-Disposition": `${media ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (route === "public") return json(publicBundle());
    if (route === "equipment")
      return json({
        items: publicResourceCatalogue(),
        notice:
          "Catalogue descriptions are not date-specific availability. Operations must check actual reservations, maintenance, transport and supplier arrangements.",
      });
    if (route === "pricing")
      return json({ options: publicPricing(), nonbinding: true });
    if (route === "health") {
      db.prepare("SELECT 1").get();
      return json({ status: "ok" });
    }
    if (route === "auth/session") {
      const pending = sessionUser(request, true);
      const user = sessionUser(request);
      return json({
        user: publicUser(user),
        mfaPending: !!pending && !user,
        preview: isPreview,
        accountsConfigured: !!db
          .prepare(
            "SELECT 1 FROM platform_users WHERE roles!='[\"customer\"]' LIMIT 1",
          )
          .get(),
      });
    }
    if (route === "content") {
      const type = request.nextUrl.searchParams.get("type");
      return json({ items: publishedContent(type || undefined) });
    }
    const user = requireUser(request);
    if (route === "workspace" || route === "portal") {
      if (route === "workspace")
        demand(
          user.roles.some((role) => role !== "customer"),
          403,
          "A staff account is required.",
        );
      const principal = route === "portal" ? customerView(user) : user;
      const inquiries = accessibleInquiries(principal),
        quotes = listQuotations(principal),
        operations = operationalRecords(principal);
      const publicOperations =
        route === "portal" ? customerOperations(operations) : operations;
      const profile = db
        .prepare("SELECT data FROM platform_profiles WHERE user_id=?")
        .get(user.id) as { data: string } | undefined;
      const permissionNames = [
        "content.edit",
        "content.publish",
        "inquiry.read",
        "inquiry.edit",
        "quotation.read",
        "quotation.edit",
        "quotation.technical",
        "quotation.finance",
        "quotation.approve",
        "pricing.edit",
        "pricing.approve",
        "booking.manage",
        "booking.confirm",
        "project.edit",
        "resource.manage",
        "resource.publish",
        "supplier.read",
        "supplier.manage",
        "supplier.approve",
        "users.manage",
        "reports.read",
        "audit.read",
        "settings.manage",
        "ai.editor",
      ];
      const capabilities = Object.fromEntries(
        permissionNames.map((action) => [
          action,
          hasPermission(principal, action),
        ]),
      );
      const response: Record<string, unknown> = {
        privacyRequests: privacyRequests(user),
        user,
        capabilities,
        inquiries:
          route === "portal"
            ? inquiries.map((inquiry) => ({
                ...inquiry,
                work: customerWork(inquiry.work),
              }))
            : inquiries,
        quotations: route === "portal" ? quotes.map(customerQuote) : quotes,
        ...publicOperations,
        profile: profile ? JSON.parse(profile.data) : {},
        preview: isPreview,
      };
      if (route === "workspace") {
        response.directory = staffDirectory();
        if (hasPermission(user, "content.edit")) {
          response.content = listContent(user);
          response.media = listCompanyDocuments(user);
        }
        if (hasPermission(user, "users.manage"))
          response.users = (
            db
              .prepare(
                "SELECT id,email,name,roles,departments,authority,state,verified_at,CASE WHEN last_totp_step>0 THEN 1 ELSE 0 END AS mfa_enabled,created_at FROM platform_users ORDER BY created_at DESC",
              )
              .all() as {
              roles: string;
              departments: string;
              authority: string;
            }[]
          ).map((row) => ({
            ...row,
            roles: JSON.parse(row.roles),
            departments: JSON.parse(row.departments),
            authority: JSON.parse(row.authority),
          }));
        if (
          user.roles.some((role) =>
            ["department_manager", "operations", "finance", "auditor"].includes(
              role,
            ),
          )
        ) {
          response.resources = (
            db.prepare("SELECT * FROM resources ORDER BY name").all() as {
              department: string;
            }[]
          ).filter((row) => user.departments.includes(row.department));
          response.priceBooks = (
            db
              .prepare("SELECT * FROM price_books ORDER BY created_at DESC")
              .all() as { department: string; rules_json: string }[]
          )
            .filter(
              (row) =>
                user.departments.includes(row.department) &&
                hasPermission(user, "pricing.edit", row.department),
            )
            .map((row) => ({ ...row, rules: JSON.parse(row.rules_json) }));
          response.report = operationalReport(user);
        }
        if (hasPermission(user, "supplier.read"))
          response.suppliers = listSuppliers(user);
        if (hasPermission(user, "audit.read")) {
          response.audit = listAuditEvents(user, {
            offset: 0,
            limit: 50,
          }).items;
        }
        if (hasPermission(user, "settings.manage")) {
          response.privacyQueue = privacyRequests(user, true);
          response.operationSettings = operationalSettings();
          response.workerRuns = db
            .prepare("SELECT * FROM job_runs ORDER BY started_at DESC LIMIT 20")
            .all();
          response.notifications = db
            .prepare(
              "SELECT id,dedup_key,state,attempts,last_error,created_at,sent_at FROM notification_outbox ORDER BY created_at DESC LIMIT 200",
            )
            .all();
          response.settings = {
            smtpConfigured: !!process.env.SMTP_PASS,
            aiConfigured: aiConfigured(),
            malwareScannerConfigured: !!process.env.MALWARE_SCANNER_PATH,
            paymentConfigured: false,
            messagingConfigured: false,
            analyticsConfigured: false,
            storage:
              "Private local filesystem / SQLite — deploy with a persistent volume and backups",
            preview: isPreview,
          };
        }
      }
      return json(response);
    }
    if (path[0] === "inquiries" && path.length === 2) {
      const inquiry = requireInquiry(user, path[1]);
      const internal = user.departments.some(
        (department) =>
          hasPermission(user, "inquiry.edit", department) &&
          workFor(inquiry.id).customer_id !== user.id &&
          inquiryDepartments(inquiry).includes(department),
      );
      return json({
        inquiry,
        work: internal ? workFor(path[1]) : customerWork(workFor(path[1])),
        messages: internal
          ? inquiryMessages(user, path[1])
          : (inquiryMessages(user, path[1]) as Record<string, unknown>[]).map(
              ({ author_id: _actor, ...safe }) => safe,
            ),
        documents: listDocuments(user, path[1]),
      });
    }
    if (path[0] === "content" && path[2] === "history")
      return json({ revisions: contentHistory(user, path[1]) });
    if (route === "suppliers") return json({ items: listSuppliers(user) });
    if (route === "audit")
      return json(
        listAuditEvents(
          user,
          auditFilters.parse(Object.fromEntries(request.nextUrl.searchParams)),
        ),
      );
    if (route === "reports") {
      const filters = reportFilters.parse(
        Object.fromEntries(request.nextUrl.searchParams),
      );
      return json(operationalReport(user, filters));
    }
    if (route === "auth/inquiry-draft")
      return json({ draft: accountDraft(user) });
    if (route === "auth/data-export") {
      const principal = customerView(user),
        inquiries = accessibleInquiries(principal),
        operations = operationalRecords(principal),
        profile = db
          .prepare("SELECT data FROM platform_profiles WHERE user_id=?")
          .get(user.id) as { data: string } | undefined;
      const exported = {
        generatedAt: new Date().toISOString(),
        savedDraft: accountDraft(user),
        account: {
          id: user.id,
          name: user.name,
          email: user.email,
          profile: profile ? JSON.parse(profile.data) : {},
        },
        inquiries: inquiries.map((inquiry) => ({
          ...inquiry,
          work: customerWork(inquiry.work),
          messages: (
            inquiryMessages(principal, inquiry.id) as Record<string, unknown>[]
          ).map(({ author_id: _actor, ...safe }) => safe),
          documents: listDocuments(principal, inquiry.id),
        })),
        quotations: listQuotations(principal).map(customerQuote),
        ...customerOperations(operations),
        feedback: db
          .prepare(
            "SELECT inquiry_id,rating,body,created_at FROM customer_feedback WHERE customer_id=?",
          )
          .all(user.id),
        privacyRequests: privacyRequests(user),
        notice:
          "Only this verified account's owned records are included. Internal notes, draft quotations, approval identities, passwords, tokens, secret keys and unrelated customer records are excluded. Approved documents can be downloaded individually from the portal.",
      };
      audit(user.id, "privacy.self_exported", "user", user.id);
      return new NextResponse(JSON.stringify(exported, null, 2), {
        headers: {
          ...privateHeaders,
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="TOC-my-data.json"',
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (route === "company-documents")
      return json({ documents: listCompanyDocuments(user) });
    if (path[0] === "company-media" && path.length === 2) {
      const file = downloadDocument(user, path[1]);
      demand(
        file.mime.startsWith("image/"),
        422,
        "This asset is not an image.",
      );
      return new NextResponse(new Uint8Array(file.bytes), {
        headers: {
          ...privateHeaders,
          "Content-Type": file.mime,
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "sandbox",
        },
      });
    }
    if (path[0] === "documents" && path.length === 2) {
      const document = downloadDocument(user, path[1]);
      return new NextResponse(new Uint8Array(document.bytes), {
        headers: {
          ...privateHeaders,
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.name)}`,
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "sandbox",
        },
      });
    }
    if (path[0] === "quotations" && path[2] === "pdf") {
      const pdf = await quotationPdf(user, path[1]);
      return new NextResponse(new Uint8Array(pdf.bytes), {
        headers: {
          ...privateHeaders,
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${pdf.name}"`,
        },
      });
    }
    demand(false, 404, "Endpoint not found.");
  }
  if (route === "documents/upload" && method === "POST")
    return json(await uploadDocument(requireUser(request), request), 201);
  const body = await readJsonLimited(
    request,
    route.startsWith("admin/content") ? 100000 : 40000,
  );
  if (method === "POST" && route === "auth/register") {
    const input = userInput.parse(body),
      existing = db
        .prepare("SELECT id FROM platform_users WHERE email=?")
        .get(input.email);
    let previewLink: string | undefined;
    if (!existing) {
      const origin = applicationUrl(request.nextUrl.origin),
        id = createUser(input),
        token = issueToken("verify", input.email, id),
        link = `${origin}/portal/verify?token=${token}`;
      queueMail(
        `verify:${id}:${hashToken(token)}`,
        input.email,
        "Verify your TOC account",
        `Verify your email to activate your TOC customer account:\n${link}\n\nThis link expires in one hour. If you did not request this, ignore this message.`,
      );
      if (isPreview) previewLink = link;
    }
    return json(
      {
        message:
          "If registration is available for this email, a verification link has been prepared. Verify your email before signing in.",
        previewLink,
        preview: isPreview,
      },
      202,
    );
  }
  if (method === "POST" && route === "auth/login") {
    demand(
      rateLimit(request, "account-password", 10, 15 * 60 * 1000),
      429,
      "Too many sign-in attempts. Wait 15 minutes.",
    );
    const input = platformInputs.Login.parse(body),
      login = loginAccount(input.email, input.password),
      token = createAccountSession(login.id, false, login.staff);
    const response = json({
      ok: true,
      mfaRequired: login.staff,
      setupRequired: login.setupRequired,
    });
    setAccountCookie(response, token, request, login.staff);
    return response;
  }
  if (method === "POST" && route === "auth/logout") {
    const token = request.cookies.get(ACCOUNT_COOKIE)?.value;
    if (token)
      db.prepare("DELETE FROM platform_sessions WHERE token_hash=?").run(
        hashToken(token),
      );
    const response = json({ ok: true });
    response.cookies.set(ACCOUNT_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: !isPreview,
      path: "/",
      maxAge: 0,
    });
    return response;
  }
  if (method === "POST" && route === "auth/verify") {
    const input = platformInputs.Token.parse(body);
    verifyAccountEmail(input.token);
    return json({ ok: true, message: "Email verified. You can now sign in." });
  }
  if (
    method === "POST" &&
    (route === "auth/reset-request" || route === "auth/resend")
  ) {
    const input = platformInputs.Email.parse(body),
      row = db
        .prepare(
          "SELECT id,verified_at FROM platform_users WHERE email=? AND state='active'",
        )
        .get(input.email.toLowerCase()) as
        { id: string; verified_at: string | null } | undefined;
    let previewLink: string | undefined;
    if (row && (route === "auth/reset-request" || !row.verified_at)) {
      const purpose = route === "auth/resend" ? "verify" : "reset",
        token = issueToken(purpose, input.email.toLowerCase(), row.id),
        link = `${applicationUrl(request.nextUrl.origin)}/portal/${purpose}?token=${token}`;
      queueMail(
        `${purpose}:${hashToken(token)}`,
        input.email.toLowerCase(),
        purpose === "verify"
          ? "Verify your TOC account"
          : "Reset your TOC password",
        `A TOC account action was requested. Open this one-time link within one hour:\n${link}\n\nIf you did not request this, ignore this message.`,
      );
      if (isPreview) previewLink = link;
    }
    return json(
      {
        message:
          "If an eligible account exists, an account email has been prepared.",
        previewLink,
        preview: isPreview,
      },
      202,
    );
  }
  if (method === "POST" && route === "auth/reset") {
    const input = platformInputs.PasswordReset.parse(body);
    resetAccountPassword(input.token, input.password);
    return json({
      ok: true,
      message:
        "Password changed. Sign in again. Staff still need their authenticator.",
    });
  }
  if (method === "POST" && route === "auth/mfa-setup") {
    const user = sessionUser(request, true);
    demand(user, 401, "Sign in with your password first.");
    demand(
      user.roles.some((role) => role !== "customer"),
      403,
      "This setup is for staff accounts.",
    );
    return json(beginMfa(user));
  }
  if (method === "POST" && route === "auth/mfa-verify") {
    demand(
      rateLimit(request, "account-mfa", 6, 5 * 60 * 1000),
      429,
      "Too many authenticator attempts. Wait five minutes.",
    );
    const user = sessionUser(request, true);
    demand(user, 401, "Sign in with your password again.");
    const input = platformInputs.MfaCode.parse(body);
    verifyMfa(user, input.code);
    const old = request.cookies.get(ACCOUNT_COOKIE)?.value;
    if (old)
      db.prepare("DELETE FROM platform_sessions WHERE token_hash=?").run(
        hashToken(old),
      );
    const response = json({ ok: true });
    setAccountCookie(response, createAccountSession(user.id, true), request);
    return response;
  }
  if (method === "POST" && route === "inquiries/claim-link") {
    const input = platformInputs.ClaimLink.parse(body),
      row = db
        .prepare("SELECT id,payload FROM inquiries WHERE reference=?")
        .get(input.reference) as { id: string; payload: string } | undefined;
    let previewLink: string | undefined;
    if (
      row &&
      JSON.parse(row.payload).email.toLowerCase() === input.email.toLowerCase()
    ) {
      const token = issueToken(
          "claim",
          input.email.toLowerCase(),
          null,
          row.id,
        ),
        link = `${applicationUrl(request.nextUrl.origin)}/portal/claim?token=${token}`;
      queueMail(
        `claim:${hashToken(token)}`,
        input.email.toLowerCase(),
        "Link your TOC inquiry",
        `To link your inquiry, verify your TOC account using the same email, sign in, then open this one-time link:\n${link}\n\nThis link expires in seven days. It does not confirm a booking.`,
      );
      if (isPreview) previewLink = link;
    }
    return json(
      {
        message:
          "If the details match, a secure account-claiming email has been prepared.",
        previewLink,
        preview: isPreview,
      },
      202,
    );
  }
  if (method === "POST" && route === "estimates") {
    const input = platformInputs.EstimateRequest.parse(body),
      items = resolvePublicPriceSelections(input.items);
    const calculated = calculateQuote({ items, discountBps: 0 });
    return json({
      ...calculated,
      currency: "TZS",
      nonbinding: true,
      notice:
        "Preliminary estimate from approved rules only; not a formal quotation or booking. Logistics and the full scope require staff review.",
    });
  }
  if (method === "POST" && route === "assistant") {
    const input = aiInput.parse(body);
    return json(await runAi(input, sessionUser(request)));
  }
  const user = requireUser(request);
  if (method === "POST" && route === "inquiries/claim") {
    const input = platformInputs.Token.parse(body);
    return json(claimInquiry(user, input.token));
  }
  if (method === "POST" && route === "auth/inquiry-draft")
    return json(saveAccountDraft(user, saveDraftSchema.parse(body)));
  if (method === "POST" && route === "auth/inquiry-draft/delete") {
    const input = platformInputs.DraftDelete.parse(body);
    return json(deleteAccountDraft(user, input.expectedVersion));
  }
  if (method === "POST" && route === "privacy-requests")
    return json(
      createPrivacyRequest(user, privacyRequestSchema.parse(body)),
      201,
    );
  if (method === "POST" && route === "admin/privacy/action")
    return json(resolvePrivacyRequest(user, privacyActionSchema.parse(body)));
  if (method === "POST" && route === "messages")
    return json(postMessage(user, messageSchema.parse(body)), 201);
  if (method === "POST" && route === "feedback") {
    const input = platformInputs.Feedback.parse(body);
    requireInquiry(user, input.inquiryId, "own");
    demand(
      db
        .prepare(
          "SELECT 1 FROM bookings WHERE inquiry_id=? AND status='completed'",
        )
        .get(input.inquiryId),
      409,
      "Feedback is available after recorded service completion.",
    );
    db.prepare(
      "INSERT INTO customer_feedback(id,inquiry_id,customer_id,rating,body,created_at) VALUES(?,?,?,?,?,?)",
    ).run(
      randomUUID(),
      input.inquiryId,
      user.id,
      input.rating,
      input.body,
      new Date().toISOString(),
    );
    audit(user.id, "feedback.received", "inquiry", input.inquiryId);
    return json({ ok: true, published: false }, 201);
  }
  if (method === "POST" && route === "auth/profile") {
    const input = platformInputs.Profile.parse(body);
    db.transaction(() => {
      db.prepare(
        "UPDATE platform_users SET name=?,updated_at=? WHERE id=?",
      ).run(input.name, new Date().toISOString(), user.id);
      db.prepare(
        "INSERT INTO platform_profiles(user_id,data) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data",
      ).run(user.id, JSON.stringify(input));
      audit(user.id, "account.profile_updated", "user", user.id);
    })();
    return json({ ok: true });
  }
  if (method === "POST" && route === "auth/password") {
    const input = platformInputs.PasswordChange.parse(body),
      row = db
        .prepare("SELECT password_hash FROM platform_users WHERE id=?")
        .get(user.id) as { password_hash: string };
    demand(
      verifyPassword(input.current, row.password_hash),
      401,
      "Your current password did not match.",
    );
    db.transaction(() => {
      db.prepare(
        "UPDATE platform_users SET password_hash=?,updated_at=? WHERE id=?",
      ).run(passwordHash(input.password), new Date().toISOString(), user.id);
      db.prepare("DELETE FROM platform_sessions WHERE user_id=?").run(user.id);
      audit(user.id, "account.password_changed", "user", user.id);
    })();
    return json({ ok: true, signInAgain: true });
  }
  if (method === "POST" && route === "admin/inquiries/assessment")
    return json(assessInquiry(user, assessmentSchema.parse(body)));
  if (method === "POST" && route === "admin/suppliers") {
    const input = platformInputs.SupplierSave.parse(body);
    return json(
      saveSupplier(user, input.supplier, input.id, input.expectedVersion),
      201,
    );
  }
  if (method === "POST" && route === "admin/suppliers/action")
    return json(actOnSupplier(user, supplierActionSchema.parse(body)));
  if (method === "POST" && route === "admin/inquiries/classification")
    return json(correctClassification(user, classificationSchema.parse(body)));
  if (method === "POST" && route === "admin/inquiries")
    return json(assignInquiry(user, assignmentSchema.parse(body)));
  if (method === "POST" && route === "admin/content")
    return json(saveContent(user, saveContentSchema.parse(body)), 201);
  if (method === "POST" && route === "admin/content/action")
    return json(changePublication(user, publishSchema.parse(body)));
  if (method === "POST" && route === "admin/quotations")
    return json(createQuotation(user, quoteSchema.parse(body)), 201);
  if (method === "POST" && route === "admin/quotations/action")
    return json(actOnQuotation(user, quoteActionSchema.parse(body)));
  if (method === "POST" && route === "quotations/decline") {
    const input = platformInputs.Decline.parse(body);
    return json(declineQuotation(user, input.id, input.reason));
  }
  if (method === "POST" && route === "quotations/accept")
    return json(acceptQuotation(user, acceptSchema.parse(body)));
  if (method === "POST" && route === "admin/pricing")
    return json(createPriceBook(user, priceBookSchema.parse(body)), 201);
  if (method === "POST" && route === "admin/pricing/approve") {
    const input = platformInputs.ApprovePriceBook.parse(body);
    return json(approvePriceBook(user, input.id, input.reason));
  }
  if (method === "POST" && route === "admin/resources") {
    const input = platformInputs.ResourceSave.parse(body);
    return json(
      saveResource(user, input.resource, input.id, input.expectedVersion),
      201,
    );
  }
  if (method === "POST" && route === "admin/bookings")
    return json(createBooking(user, bookingSchema.parse(body)), 201);
  if (method === "POST" && route === "admin/bookings/action")
    return json(actOnBooking(user, bookingActionSchema.parse(body)));
  if (method === "POST" && route === "admin/visits")
    return json(updateVisit(user, visitSchema.parse(body)));
  if (method === "POST" && route === "admin/projects/milestone")
    return json(completeMilestone(user, milestoneSchema.parse(body)));
  if (method === "POST" && route === "admin/users/access")
    return json(
      (updateAccess(user, roleUpdateSchema.parse(body)), { ok: true }),
    );
  if (method === "POST" && route === "admin/users/invite") {
    authorize(user, "users.manage");
    const input = platformInputs.Invite.parse(body),
      id = createUser(
        {
          ...input,
          email: input.email.toLowerCase(),
          password: randomBytes(40).toString("base64url"),
        },
        ["customer"],
      ),
      origin = applicationUrl(request.nextUrl.origin),
      verification = issueToken("verify", input.email, id),
      reset = issueToken("reset", input.email, id);
    queueMail(
      `invite:${id}`,
      input.email,
      "Your TOC account invitation",
      `Your TOC account has been invited. An administrator will assign your authorized role separately.\nVerify email: ${origin}/portal/verify?token=${verification}\nSet password: ${origin}/portal/reset?token=${reset}\nBoth links expire in one hour. Staff access also requires an authenticator.`,
    );
    audit(user.id, "account.invited", "user", id);
    return json(
      {
        id,
        previewLinks: isPreview
          ? [
              `${origin}/portal/verify?token=${verification}`,
              `${origin}/portal/reset?token=${reset}`,
            ]
          : undefined,
      },
      201,
    );
  }
  if (method === "POST" && route === "admin/users/reset-mfa") {
    authorize(user, "users.manage");
    const input = platformInputs.MfaReset.parse(body);
    demand(
      input.id !== user.id,
      403,
      "A different administrator must verify your identity and reset your authenticator.",
    );
    db.transaction(() => {
      demand(
        db.prepare("SELECT 1 FROM platform_users WHERE id=?").get(input.id),
        404,
        "Account not found.",
      );
      db.prepare(
        "UPDATE platform_users SET totp_secret=NULL,last_totp_step=0 WHERE id=?",
      ).run(input.id);
      db.prepare("DELETE FROM platform_sessions WHERE user_id=?").run(input.id);
      audit(
        user.id,
        "account.mfa_reset",
        "user",
        input.id,
        undefined,
        undefined,
        input.reason,
      );
    })();
    return json({ ok: true });
  }
  if (method === "POST" && route === "admin/redirects") {
    authorize(user, "content.publish");
    const input = platformInputs.Redirect.parse(body);
    demand(
      input.from !== input.to,
      422,
      "A redirect must have a different destination.",
    );
    demand(
      !db
        .prepare("SELECT 1 FROM content_redirects WHERE old_path=?")
        .get(input.to),
      409,
      "Redirect chains are not permitted.",
    );
    const destination = input.to.split("/");
    const type =
      destination[1] === "news"
        ? "article"
        : destination[1] === "projects"
          ? "project"
          : "service";
    demand(
      publishedContent(type).some((item) => item.slug === destination[2]),
      422,
      "Redirect only to an existing published destination.",
    );
    db.prepare(
      "INSERT INTO content_redirects(old_path,new_path,created_at) VALUES(?,?,?) ON CONFLICT(old_path) DO UPDATE SET new_path=excluded.new_path",
    ).run(input.from, input.to, new Date().toISOString());
    audit(
      user.id,
      "content.redirect_saved",
      "redirect",
      input.from,
      undefined,
      input.to,
      input.reason,
    );
    return json({ ok: true });
  }
  if (method === "POST" && route === "admin/settings/operations") {
    const input = platformInputs.SettingsUpdate.parse(body);
    return json(
      saveOperationalSettings(
        user,
        input.settings,
        input.expectedVersion,
        input.reason,
      ),
    );
  }
  if (method === "POST" && route === "admin/jobs") {
    authorize(user, "settings.manage");
    audit(user.id, "jobs.manual_requested", "settings", "worker");
    return json(await runBackgroundJobs());
  }
  demand(false, 404, "Endpoint not found.");
}
async function route(request: NextRequest, context: Context) {
  try {
    return await handle(request, context);
  } catch (error) {
    if (error instanceof PlatformError)
      return json({ error: error.message }, error.status);
    if (error instanceof ZodError)
      return json(
        {
          error: "Check the highlighted details.",
          fields: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        422,
      );
    const message = error instanceof Error ? error.message : "";
    if (message === "TOO_LARGE")
      return json({ error: "The request exceeds the allowed size." }, 413);
    if (message === "INVALID_JSON" || message === "CONTENT_TYPE")
      return json({ error: "Send a valid JSON request." }, 400);
    if (message.includes("UNIQUE constraint"))
      return json(
        { error: "That record already exists. Reload before retrying." },
        409,
      );
    const requestId = randomUUID();
    console.error("Platform request failed.", { requestId });
    return json(
      {
        error:
          "This action could not be completed. Refresh and check the latest records before retrying; some work may already have been saved.",
        requestId,
      },
      500,
    );
  }
}
export const GET = route;
export const POST = route;
export const PATCH = route;
export const DELETE = route;
