// Integration checks deliberately require an isolated, synthetic preview database.
// Prepare: npm run test:browser:prepare; start npm run preview:qa separately.
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHmac } from "node:crypto";
import { createApiContract } from "./lib/api-contract.mjs";
const contract = createApiContract();
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const fixture = JSON.parse(
  readFileSync("research/blueprint-fixture.json", "utf8"),
);
const session = await (await fetch(`${base}/api/platform/auth/session`)).json();
const content = await (
  await fetch(`${base}/api/platform/content?type=page`)
).json();
assert.equal(
  session.preview,
  true,
  "Live delivery must never be used for browser fixtures",
);
assert.ok(
  content.items.some((item) => item.slug === "synthetic-qa-page"),
  "Refusing to write test records to a non-fixture database",
);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--no-zygote",
  ],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
  acceptDownloads: true,
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const report = {
  phase: process.env.TEST_BROWSER_PHASE === "private" ? "private" : "full",
  startedAt: new Date().toISOString(),
  checks: [],
  accessibility: [],
  runtimeErrors: [],
  contractErrors: [],
  contractTransport:
    "Playwright same-origin route.fetch before browser delivery; not a timing/performance measurement",
  interruptedAfterValidation: [],
};
const contractChecks = [];
// Capture server bytes before Chromium can discard a navigated page's body.
// route.fetch forwards the original request exactly once, including cookies,
// headers and POST data; fulfill returns those same bytes/status to the browser.
const watchApi = async (browserContext) =>
  browserContext.route("**/api/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    const operation = contract.describeOperation(method, path);
    const task = (async () => {
      let response;
      let bytes;
      try {
        response = await route.fetch({ timeout: 30000, maxRedirects: 0 });
        bytes = await response.body();
        const contentType = response.headers()["content-type"] || "";
        contract.assertResponse({
          method,
          path,
          status: response.status(),
          contentType,
          data: contentType.includes("application/json")
            ? JSON.parse(bytes.toString("utf8"))
            : undefined,
        });
      } catch (error) {
        report.contractErrors.push(
          error instanceof Error &&
            /^(?:GET|POST|PATCH) \/api\//.test(error.message)
            ? error.message
            : `${operation}: server response could not be validated; no payload was recorded.`,
        );
        if (!response) {
          await route.abort().catch(() => {});
          return;
        }
      }
      try {
        await route.fulfill({ response, body: bytes });
      } catch (error) {
        if (
          method === "GET" &&
          (request.failure()?.errorText === "net::ERR_ABORTED" ||
            (error instanceof Error &&
              /(?:Target page, context or browser has been closed|Invalid InterceptionId|interception.*(?:not found|invalid))/i.test(
                error.message,
              )))
        ) {
          report.interruptedAfterValidation.push(operation);
        } else
          report.contractErrors.push(
            `${operation}: browser delivery failed after response validation.`,
          );
      }
    })();
    contractChecks.push(task);
    return task;
  });
await watchApi(context);
const watch = (p) =>
  p.on("pageerror", (error) => report.runtimeErrors.push(error.message));
watch(page);
const pass = (text) => {
  report.checks.push(text);
  console.log("PASS", text);
};
const go = async (route, p = page) => {
  const response = await p.goto(base + route, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  return response;
};
const layout = async (p = page) => {
  const sizes = await p.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert.ok(
    sizes.document <= sizes.viewport + 1,
    `${new URL(p.url()).pathname}: ${sizes.document}px overflows ${sizes.viewport}px`,
  );
  await expect(p.locator("h1")).toHaveCount(1);
  assert.equal(
    await p
      .locator("img")
      .evaluateAll(
        (images) =>
          images.filter((img) => img.complete && !img.naturalWidth).length,
      ),
    0,
    `Broken image: ${p.url()}`,
  );
};
const audit = async (name, p = page) => {
  await p.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo({ top: 0, behavior: "instant" });
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
  const result = await new AxeBuilder({ page: p })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const violations = result.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.map((n) => ({ target: n.target, detail: n.failureSummary })),
  }));
  report.accessibility.push({ name, violations });
  assert.deepEqual(violations, [], `Accessibility: ${name}`);
};
const language = async (lang, p = page) => {
  if ((await p.locator("html").getAttribute("lang")) === lang) return;
  await p
    .getByRole("button", { name: lang.toUpperCase(), exact: true })
    .click();
  await expect(p.locator("html")).toHaveAttribute("lang", lang);
};
const next = (lang = "en", p = page) =>
  p
    .getByRole("button", {
      name: lang === "en" ? "Continue" : "Endelea",
      exact: true,
    })
    .click();
const divisions = [
  "event-management",
  "catering",
  "general-cleaning",
  "ict-solutions",
  "entertainment",
];
const routes = [
  "/",
  "/about",
  "/services",
  ...divisions.map((id) => `/services/${id}`),
  "/gallery",
  "/projects",
  "/clients",
  "/news",
  "/careers",
  "/opportunities",
  "/downloads",
  "/about/leadership",
  "/contact",
  "/request-quotation",
  "/quality-and-safety",
  "/privacy",
  "/terms",
  "/projects/synthetic-qa-project",
  "/news/synthetic-qa-article",
  "/synthetic-qa-page",
];
let serial = 10;
async function fillRequest(service, lang = "en", p = page, estimate = true) {
  await go(`/request-quotation?service=${service}`, p);
  await language(lang, p);
  await next(lang, p);
  if (service === "event-management") {
    await p.locator("#quote-cateringRequired").selectOption("yes");
    await expect(p.locator("#quote-mealTimes")).toBeVisible();
    await p.locator("#quote-mealTimes").fill("Synthetic lunch service at noon");
    await p.locator("#quote-kitchenAccess").selectOption("discuss");
  }
  if (["event-management", "catering", "entertainment"].includes(service)) {
    await p.locator("#quote-eventType").selectOption("Corporate event");
    await p.locator("#quote-guestCount").fill("60");
  }
  if (service === "general-cleaning") {
    await p.locator("#quote-propertyType").selectOption("office");
    await p.locator("#quote-frequency").selectOption("weekly");
    await p.locator("#quote-area").fill("250");
  }
  if (service === "ict-solutions") {
    await p.locator("#quote-ictCategory").selectOption("website");
    await p.locator("#quote-urgency").selectOption("normal");
    await p.locator("#quote-deliveryMode").selectOption("remote");
  }
  await p.locator("#quote-region").selectOption("Dodoma");
  await p.locator("#quote-location").fill("SYNTHETIC QA Dodoma venue");
  await next(lang, p);
  await expect(p.locator(".estimate-planner")).toBeVisible();
  if (estimate) {
    await p.locator(".estimate-planner>summary").click();
    await p
      .getByRole("button", {
        name:
          lang === "en"
            ? "Add approved option"
            : "Ongeza chaguo lililoidhinishwa",
        exact: true,
      })
      .click();
    await p.locator(".estimate-row input").fill("2");
    await p
      .getByRole("button", {
        name:
          lang === "en"
            ? "Calculate nonbinding estimate"
            : "Kokotoa makadirio yasiyo bei rasmi",
        exact: true,
      })
      .click();
    await expect(p.locator(".estimate-result")).toContainText("40");
  }
  if (["catering", "general-cleaning", "entertainment"].includes(service))
    await p.locator("#quote-preferences input").first().check();
  if (service === "catering" || service === "event-management")
    await p.locator("#quote-serviceStyle").selectOption("discuss");
  await p
    .locator("#quote-message")
    .fill(
      "Synthetic browser assessment only. No real customer information or credentials.",
    );
  await next(lang, p);
  await p.locator("#quote-name").fill("Synthetic Browser Customer");
  await p.locator("#quote-email").fill("synthetic-browser@example.test");
  await p.locator("#quote-phone").fill("+255700000002");
  if (await p.locator("#quote-leadSource").count())
    await p.locator("#quote-leadSource").selectOption("referral");
  await next(lang, p);
  await expect(p.locator(".review-step").first()).toBeVisible();
  await expect(p.locator(".review-step").first()).toContainText("Dodoma");
}
function totp(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret]
    .map((c) => alphabet.indexOf(c).toString(2).padStart(5, "0"))
    .join("");
  const bytes = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const time = Buffer.alloc(8);
  time.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hash = createHmac("sha1", bytes).update(time).digest(),
    offset = hash.at(-1) & 15;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(
    6,
    "0",
  );
}
try {
  if (process.env.TEST_BROWSER_PHASE !== "private") {
    for (const lang of ["en", "sw"]) {
      await go("/");
      await language(lang);
      for (const width of [1440, 768, 390, 320]) {
        await page.setViewportSize({ width, height: width < 700 ? 844 : 1050 });
        for (const route of routes) {
          const response = await go(route);
          assert.equal(response.status(), 200, route);
          await layout();
        }
        pass(
          `${routes.length} public routes, ${lang.toUpperCase()}, ${width}px: one H1, intact images, no overflow`,
        );
      }
    }
    await page.setViewportSize({ width: 1440, height: 1050 });
    for (const route of [
      "/",
      "/services/general-cleaning",
      "/services/ict-solutions",
      "/projects/synthetic-qa-project",
    ]) {
      await go(route);
      await audit(route);
    }
    await go("/news/synthetic-qa-article");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/news\/synthetic-qa-article$/,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Synthetic social preview",
    );
    assert.equal((await go("/not-a-published-page")).status(), 404);
    await go("/");
    await language("en");
    await page.setViewportSize({ width: 320, height: 844 });
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await expect(page.locator("#mobile-navigation")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#mobile-navigation")).toHaveCount(0);
    pass(
      "Dynamic canonical/social metadata, unknown-page 404 and keyboard mobile navigation",
    );

    await page.setViewportSize({ width: 1440, height: 1050 });
    for (const lang of ["en", "sw"])
      for (const service of divisions) {
        await page.setExtraHTTPHeaders({
          "X-Forwarded-For": `198.51.100.${++serial}`,
        });
        await fillRequest(service, lang);
        await audit(`${service}/${lang}/review`);
        await page.locator("#quote-consent").check();
        if (service === "general-cleaning" && lang === "en") {
          await page.route(
            "**/api/inquiries",
            (route) =>
              route.fulfill({
                status: 422,
                contentType: "application/json",
                body: JSON.stringify({
                  error: "Synthetic stale rate check",
                  fields: {
                    pricingSelections:
                      "Synthetic rate expired — review or remove the choice.",
                  },
                }),
              }),
            { times: 1 },
          );
          await page
            .getByRole("button", { name: "Send my request", exact: true })
            .click();
          await expect(page.locator("#quote-pricingSelections")).toContainText(
            "Synthetic rate expired",
          );
          await next(lang);
          await next(lang);
        }
        const responsePromise = page.waitForResponse(
          (response) =>
            response.url().endsWith("/api/inquiries") &&
            response.request().method() === "POST",
        );
        await page
          .getByRole("button", {
            name: lang === "en" ? "Send my request" : "Tuma ombi langu",
            exact: true,
          })
          .click();
        const response = await responsePromise,
          submitted = response.request().postDataJSON(),
          receipt = await response.json();
        assert.equal(response.status(), 201, JSON.stringify(receipt));
        assert.equal(submitted.service, service);
        assert.equal(submitted.language, lang);
        assert.equal(submitted.pricingSelections[0].quantity, "2");
        assert.equal(receipt.deliveryStatus, "preview_local_only");
        await expect(page.locator(".success-panel")).toBeVisible();
        await expect(page.locator(".reference-box strong")).toHaveText(
          receipt.reference,
        );
        const downloadPromise = page.waitForEvent("download");
        await page
          .getByRole("button", {
            name: lang === "en" ? "Download summary" : "Pakua muhtasari",
            exact: true,
          })
          .click();
        const download = await downloadPromise,
          summary = readFileSync(await download.path(), "utf8");
        assert.ok(
          summary.includes(receipt.reference) &&
            summary.includes("qa-assessment") &&
            summary.includes("Dodoma"),
        );
        pass(
          `${service}/${lang}: estimate → reviewed intake → saved reference → complete downloaded handover`,
        );
      }
    await go("/contact");
    await language("sw");
    await page.setExtraHTTPHeaders({
      "X-Forwarded-For": `198.51.100.${++serial}`,
    });
    await page.locator("#contact-name").fill("Synthetic Contact");
    await page.locator("#contact-email").fill("contact-qa@example.test");
    await page
      .locator("#contact-message")
      .fill("Synthetic Kiswahili contact language preservation check.");
    await page.locator("#contact-consent").check();
    const contactResponse = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/inquiries") && r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Tuma ujumbe wako", exact: true })
      .click();
    const savedContact = await contactResponse;
    assert.equal(savedContact.request().postDataJSON().language, "sw");
    assert.equal(savedContact.status(), 201);
    assert.equal(
      (await savedContact.json()).deliveryStatus,
      "preview_local_only",
    );
    await expect(page.locator(".success-panel")).toBeVisible();
    pass(
      "Contact form preserves the selected language and uses the same save-first intake",
    );
  }
  await context.addCookies([
    { name: "toc_account_session", value: fixture.customer.session, url: base },
  ]);
  await go("/request-quotation?service=ict-solutions");
  await language("en");
  await next();
  await page
    .locator("#quote-location")
    .fill("Synthetic account draft location");
  await page.locator(".account-draft-controls>summary").click();
  await page
    .getByRole("button", { name: "Save to my account", exact: true })
    .click();
  await expect(
    page.getByText("Saved to your account. Nothing was submitted.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".account-draft-controls>summary").click();
  await page
    .getByRole("button", { name: "Resume account draft", exact: true })
    .click();
  await expect(page.locator("#quote-location")).toHaveValue(
    "Synthetic account draft location",
  );
  const draftDeleted = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/platform/auth/inquiry-draft/delete") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Delete saved account draft", exact: true })
    .click();
  const deletionResponse = await draftDeleted;
  assert.equal(deletionResponse.status(), 200);
  assert.equal((await deletionResponse.json()).ok, true);
  await expect(
    page.getByText("Account draft deleted.", { exact: true }),
  ).toBeVisible();
  pass(
    "Verified-account incomplete draft saves, resumes and deletes without submitting or pre-recording consent",
  );

  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/portal",
      "/portal/requests",
      "/portal/quotations",
      "/portal/bookings",
      "/portal/projects",
      "/portal/documents",
      "/portal/messages",
      "/portal/profile",
    ]) {
      await go(route);
      await expect(page.locator(".platform-shell")).toBeVisible();
      await layout();
    }
  }
  await go("/portal/requests");
  await page.locator(".platform-record-list>button").first().click();
  await expect(page.locator(".platform-record-detail")).toContainText(
    "Synthetic customer-visible progress message.",
  );
  await expect(page.locator(".platform-record-detail")).not.toContainText(
    "PRIVATE STAFF QA MARKER",
  );
  await page.setViewportSize({ width: 1440, height: 1050 });
  await audit("customer inquiry");
  await go("/portal/quotations");
  await page.locator(".platform-record-list>button").first().click();
  const pdfHref = await page
    .getByRole("link", { name: "Download quotation PDF", exact: true })
    .getAttribute("href");
  const pdf = await context.request.get(base + pdfHref);
  assert.equal(pdf.status(), 200);
  assert.equal((await pdf.body()).subarray(0, 5).toString(), "%PDF-");
  const customerWorkspace = await (
    await context.request.get(`${base}/api/platform/portal`)
  ).json();
  const ictOffer = customerWorkspace.quotations.find(
    (offer) =>
      offer.inquiry_id === fixture.records["ict-solutions"] &&
      offer.version === offer.current_version,
  );
  assert.ok(
    ictOffer,
    "Synthetic ICT offer is visible only after authorized issuance",
  );
  await page
    .locator(".platform-record-list>button")
    .filter({ hasText: ictOffer.reference })
    .click();
  if (ictOffer.status === "issued") {
    await page.locator(".platform-record-detail").getByRole("checkbox").check();
    const acceptance = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/platform/quotations/accept") &&
        r.request().method() === "POST",
    );
    await page
      .getByRole("button", {
        name: `Accept ${ictOffer.reference} · version ${ictOffer.version}`,
        exact: true,
      })
      .click();
    assert.equal((await acceptance).status(), 200);
  } else assert.equal(ictOffer.status, "accepted");
  const afterAcceptance = await (
    await context.request.get(`${base}/api/platform/portal`)
  ).json();
  assert.equal(
    afterAcceptance.quotations.find((offer) => offer.id === ictOffer.id).status,
    "accepted",
  );
  pass(
    "Customer explicitly accepts the exact issued ICT version; no automatic booking commitment",
  );
  await page.setViewportSize({ width: 320, height: 844 });
  await page
    .getByRole("button", { name: "Toggle workspace navigation", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".platform-sidebar")).not.toBeVisible();
  pass(
    "Eight customer screens at desktop/mobile, private-note separation, protected PDF and keyboard workspace navigation",
  );

  const staffContext = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
  });
  await watchApi(staffContext);
  const staffPage = await staffContext.newPage();
  watch(staffPage);
  await go("/admin", staffPage);
  await staffPage
    .getByLabel("Email address", { exact: true })
    .fill(fixture.staff.email);
  await staffPage
    .getByLabel("Password", { exact: true })
    .fill(fixture.password);
  await staffPage.getByRole("button", { name: "Sign in", exact: true }).click();
  await staffPage
    .getByLabel("Authenticator code", { exact: true })
    .fill(totp(fixture.staff.totpSecret));
  await staffPage
    .getByRole("button", { name: "Verify & sign in", exact: true })
    .click();
  await expect(staffPage.locator(".platform-shell")).toBeVisible();
  pass("Individual staff password + authenticator browser sign-in");
  const staffRoutes = [
    "dashboard",
    "requests",
    "content",
    "quotations",
    "bookings",
    "projects",
    "visits",
    "documents",
    "messages",
    "resources",
    "suppliers",
    "pricing",
    "users",
    "reports",
    "assistant",
    "audit",
    "settings",
    "profile",
  ];
  for (const width of [1440, 320]) {
    await staffPage.setViewportSize({ width, height: 1050 });
    for (const screen of staffRoutes) {
      await go(`/admin/${screen}`, staffPage);
      await expect(staffPage.locator(".platform-shell")).toBeVisible();
      await layout(staffPage);
    }
  }
  await staffPage.setViewportSize({ width: 1440, height: 1050 });
  await go("/admin/bookings", staffPage);
  let operationsData = await (
    await staffPage.request.get(`${base}/api/platform/workspace`)
  ).json();
  let ictBooking = operationsData.bookings.find(
    (booking) => booking.quotation_version_id === ictOffer.id,
  );
  if (!ictBooking) {
    await staffPage
      .getByRole("button", { name: "Prepare booking", exact: true })
      .click();
    await staffPage
      .getByLabel("Current accepted quotation", { exact: true })
      .selectOption(ictOffer.id);
    await expect(
      staffPage.getByLabel("Cleaning recurrence", { exact: true }),
    ).toBeDisabled();
    const allocations = staffPage.getByRole("group", {
      name: "Resource allocations",
      exact: true,
    });
    await expect(allocations).not.toContainText("SYNTHETIC QA display");
    await staffPage
      .getByLabel("First start (your local time)", { exact: true })
      .fill(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16));
    await staffPage
      .getByLabel("First visit end (your local time)", { exact: true })
      .fill(
        new Date(Date.now() + 3 * 86400000 + 3600000)
          .toISOString()
          .slice(0, 16),
      );
    await staffPage
      .getByLabel("Assigned supervisor", { exact: true })
      .selectOption(operationsData.user.id);
    await staffPage
      .getByLabel("Team & delivery arrangements", { exact: true })
      .fill("SYNTHETIC QA only; no live service commitment.");
    const bookingSaved = staffPage.waitForResponse(
      (r) =>
        r.url().endsWith("/api/platform/admin/bookings") &&
        r.request().method() === "POST",
    );
    await staffPage
      .getByRole("button", {
        name: "Create pending booking — not confirmed",
        exact: true,
      })
      .click();
    assert.equal((await bookingSaved).status(), 201);
    operationsData = await (
      await staffPage.request.get(`${base}/api/platform/workspace`)
    ).json();
    ictBooking = operationsData.bookings.find(
      (booking) => booking.quotation_version_id === ictOffer.id,
    );
    assert.equal(ictBooking.status, "pending");
  }
  await staffPage
    .locator(".platform-record-list>button")
    .filter({ hasText: ictBooking.reference })
    .click();
  if (ictBooking.status === "pending") {
    const checks = staffPage
      .locator("details.platform-panel")
      .filter({ hasText: "Operational authority & checks" });
    await checks.locator("summary").click();
    const conditions = checks.getByRole("checkbox");
    assert.equal(await conditions.count(), 5);
    for (const condition of await conditions.all()) await condition.check();
    await checks
      .getByLabel("Decision evidence / conditions", { exact: true })
      .fill(
        "SYNTHETIC QA checks only. No actual contract, payment or availability attestation.",
      );
    const confirmation = staffPage.waitForResponse(
      (r) =>
        r.url().endsWith("/api/platform/admin/bookings/action") &&
        r.request().method() === "POST",
    );
    await checks
      .getByRole("button", { name: "confirm booking", exact: true })
      .click();
    assert.equal((await confirmation).status(), 200);
  }
  const customerBookings = await (
    await context.request.get(`${base}/api/platform/portal`)
  ).json();
  assert.equal(
    customerBookings.bookings.find((booking) => booking.id === ictBooking.id)
      .status,
    "confirmed",
  );
  pass(
    "ICT booking filters resources/supervisors by scope and requires separate explicit operations confirmation",
  );
  await go("/admin/requests", staffPage);
  const source = await (
    await staffPage.request.get(
      `${base}/api/platform/inquiries/${fixture.records["ict-solutions"]}`,
    )
  ).json();
  await staffPage
    .locator(".platform-record-list button")
    .filter({ hasText: source.inquiry.reference })
    .click();
  const assessment = staffPage.locator("details.platform-panel").filter({
    hasText: "Qualification & opportunity outcome",
  });
  await assessment.locator("summary").click();
  await assessment
    .getByLabel("Qualification", { exact: true })
    .selectOption("qualified");
  for (const label of [
    "Service fit reviewed",
    "Minimum requirements reviewed",
    "Follow-up contact reviewed",
  ])
    await assessment.getByLabel(label, { exact: true }).check();
  await assessment
    .getByLabel("Assessment / loss reason (internal)")
    .fill(
      "SYNTHETIC QA ONLY. Staff reviewed test service fit, requirements and follow-up contact.",
    );
  const assessmentSaved = staffPage.waitForResponse(
    (response) =>
      response.url().endsWith("/admin/inquiries/assessment") &&
      response.request().method() === "POST",
  );
  await assessment
    .getByRole("button", { name: "Save reviewed assessment", exact: true })
    .click();
  assert.equal((await assessmentSaved).status(), 200);
  const reviewedSource = await (
    await staffPage.request.get(
      `${base}/api/platform/inquiries/${fixture.records["ict-solutions"]}`,
    )
  ).json();
  assert.equal(reviewedSource.work.qualification, "qualified");
  await go("/admin/suppliers", staffPage);
  const supplier = staffPage
    .locator("article")
    .filter({ hasText: "SYNTHETIC QA supplier" });
  await supplier
    .getByLabel("Approval expiry (your local time)")
    .fill(new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 16));
  await supplier
    .getByLabel("Approval evidence", { exact: true })
    .fill(
      "SYNTHETIC QA ONLY. Independent test supplier assessment; no real approved arrangement.",
    );
  await supplier
    .getByRole("button", { name: "Record supplier decision", exact: true })
    .click();
  await expect(supplier.locator(".platform-badge")).toHaveText("approved");
  await audit("supplier administration", staffPage);
  await go("/admin/audit", staffPage);
  await staffPage
    .getByLabel("Action", { exact: true })
    .fill("inquiry.assessed");
  await staffPage
    .getByRole("button", { name: "Apply audit filters", exact: true })
    .click();
  await expect(
    staffPage.locator(".audit-events details").first(),
  ).toContainText("inquiry.assessed");
  await audit("filtered audit evidence", staffPage);
  pass(
    "Human-reviewed qualification, independent dated supplier approval and server-filtered audit evidence",
  );
  await go("/admin/content", staffPage);
  await staffPage
    .locator(".cms-record-list>button")
    .filter({ hasText: "homepage · /home" })
    .click();
  await staffPage
    .getByRole("button", { name: "Preview draft", exact: true })
    .click();
  await staffPage
    .getByRole("button", { name: "320px mobile preview", exact: true })
    .click();
  await expect(staffPage.locator(".cms-preview")).toHaveClass(/is-mobile/);
  await staffPage
    .getByRole("button", { name: "Preview Kiswahili", exact: true })
    .click();
  await expect(staffPage.locator(".cms-preview")).toHaveAttribute("lang", "sw");
  await audit("CMS mobile bilingual preview", staffPage);
  await go("/admin/quotations", staffPage);
  await staffPage
    .getByRole("button", { name: "Prepare quotation", exact: true })
    .click();
  await staffPage
    .getByLabel("Source inquiry")
    .selectOption(fixture.records["ict-solutions"]);
  await staffPage
    .getByRole("button", {
      name: "Suggest scope from source inquiry",
      exact: true,
    })
    .click();
  await expect(
    staffPage.getByRole("button", {
      name: "Use this draft scope for staff review",
      exact: true,
    }),
  ).toBeVisible();
  await staffPage
    .getByRole("button", {
      name: "Use this draft scope for staff review",
      exact: true,
    })
    .click();
  await expect(
    staffPage.getByLabel("Agreed technical scope", { exact: true }),
  ).toHaveValue(/Draft only/);
  await go("/admin/reports", staffPage);
  await audit("operational reports", staffPage);
  await staffPage.getByRole("button", { name: "SW", exact: true }).click();
  await expect(
    staffPage.getByRole("heading", { name: "Ripoti", exact: true }),
  ).toBeVisible();
  await expect(
    staffPage.getByRole("heading", {
      name: "Tenganisha vipimo vya fedha.",
      exact: true,
    }),
  ).toBeVisible();
  pass(
    "18 staff screens at desktop/mobile, separate CMS device/language previews, review-only scope drafting, bilingual reports",
  );
  await Promise.all(contractChecks);
  report.apiContract = contract.summary();
  assert.deepEqual(
    report.contractErrors,
    [],
    "API response contract mismatches",
  );
  pass(
    `${report.apiContract.responses} captured server API responses across ${report.apiContract.operations} operations conform to the checked OpenAPI projections`,
  );
  assert.deepEqual(report.runtimeErrors, [], "Browser runtime errors");
  report.completedAt = new Date().toISOString();
  console.log(
    "ALL BLUEPRINT BROWSER CHECKS PASSED — synthetic isolated data; no real mail, AI provider or malware scanner used.",
  );
} catch (error) {
  report.failure = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  await Promise.all(contractChecks);
  report.apiContract = contract.summary();
  mkdirSync("research", { recursive: true });
  writeFileSync(
    "research/blueprint-browser-report.json",
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
