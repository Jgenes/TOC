import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import Database from "better-sqlite3";

const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const localEnv = (() => {
  try {
    return readFileSync(".env.local", "utf8");
  } catch {
    return "";
  }
})();
const password =
  process.env.STAFF_PASSWORD || localEnv.match(/^STAFF_PASSWORD=(.+)$/m)?.[1];
const createdReferences = [];
const report = {
  startedAt: new Date().toISOString(),
  checks: [],
  accessibility: [],
  runtimeErrors: [],
};
mkdirSync("research", { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
  acceptDownloads: true,
});
const page = await context.newPage();
page.on("pageerror", (error) => report.runtimeErrors.push(error.message));
const go = async (route) => {
  await page.goto(base + route, { waitUntil: "networkidle", timeout: 60000 });
};
const check = (message) => {
  report.checks.push(message);
  console.log("PASS", message);
};
const audit = async (route, state) => {
  // Focus changes can start smooth scrolling; scanning mid-scroll makes fixed
  // headers appear to obscure controls that are reachable once scrolling stops.
  await page.evaluate(async () => {
    await document.fonts.ready;
    let previous = window.scrollY;
    let stable = 0;
    for (let frame = 0; frame < 180; frame++) {
      await new Promise(requestAnimationFrame);
      const current = window.scrollY;
      stable = current === previous ? stable + 1 : 0;
      if (stable >= 8) return;
      previous = current;
    }
    throw new Error(
      "Page scrolling did not settle before accessibility audit.",
    );
  });
  const result = await new AxeBuilder({ page })
    .exclude("nextjs-portal")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const violations = result.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    targets: v.nodes.map((n) => ({
      target: n.target,
      detail: n.failureSummary,
    })),
  }));
  report.accessibility.push({ route, state, violations });
  if (violations.length)
    console.log("AXE", route, state, JSON.stringify(violations));
  return violations;
};
let failed;
try {
  const routes = [
    "/",
    "/about",
    "/services",
    "/services/event-management",
    "/services/catering",
    "/services/entertainment",
    "/gallery",
    "/contact",
    "/request-quotation",
    "/quality-and-safety",
    "/privacy",
    "/terms",
  ];
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 1050 });
    for (const route of routes) {
      await go(route);
      await expect(page.locator("h1")).toHaveCount(1);
      const dimensions = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
      }));
      assert.ok(
        dimensions.document <= dimensions.viewport + 1,
        `${route} overflow at ${width}: ${dimensions.document}`,
      );
      assert.equal(
        await page
          .locator("img")
          .evaluateAll(
            (images) =>
              images.filter((img) => img.complete && !img.naturalWidth).length,
          ),
        0,
        `${route} broken images`,
      );
      if (
        width === 1440 &&
        ["/", "/contact", "/gallery", "/request-quotation"].includes(route)
      ) {
        await audit(route, "desktop");
        await page.screenshot({
          path: `research/final-${route === "/" ? "home" : route.slice(1)}-desktop.png`,
          fullPage: true,
        });
      }
    }
    check(
      `12 public routes: one H1, images and no horizontal overflow at ${width}px`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await go("/");
  await page.screenshot({
    path: "research/final-home-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await expect(page.locator("#mobile-navigation")).toBeVisible();
  await page
    .locator("#mobile-navigation")
    .getByRole("link", { name: "Contact", exact: true })
    .click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.locator("#mobile-navigation")).toHaveCount(0);
  check("Mobile navigation opens, navigates and closes");
  await go("/");
  await page.getByRole("button", { name: "SW", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "sw");
  for (const route of routes.slice(0, 10)) {
    await go(route);
    await expect(page.locator("html")).toHaveAttribute("lang", "sw");
    const dimensions = await page.evaluate(() => ({
      v: innerWidth,
      w: document.documentElement.scrollWidth,
    }));
    assert.ok(
      dimensions.w <= dimensions.v + 1,
      `Kiswahili overflow at ${route}: ${dimensions.w}`,
    );
  }
  check(
    "Kiswahili language selection persists and ten public layouts remain responsive",
  );
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await go("/gallery");
  await page.getByRole("button", { name: "Catering", exact: true }).click();
  await expect(page.locator(".gallery-item")).toHaveCount(3);
  await page.locator(".gallery-item").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const caption = await page
    .locator(".lightbox figcaption strong")
    .textContent();
  await page.keyboard.press("ArrowRight");
  assert.notEqual(
    await page.locator(".lightbox figcaption strong").textContent(),
    caption,
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".gallery-item").first()).toBeFocused();
  check("Gallery filters, arrow navigation, Escape and focus restoration");
  await page
    .getByRole("button", { name: "Open TOC service guide", exact: true })
    .click();
  await page
    .getByRole("button", { name: "How do I get a quotation?", exact: true })
    .click();
  await expect(page.locator(".guide-answer")).toContainText("No payment");
  await page
    .getByRole("button", { name: "Close service guide", exact: true })
    .click();
  check("Preset service guide provides accurate non-binding guidance");

  await page.setViewportSize({ width: 1440, height: 1050 });
  await go("/request-quotation");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".field-error")).toContainText("Choose a service");
  await page.locator(".service-selector>label").nth(1).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator("#quote-eventType").selectOption("Conference or workshop");
  await page.locator("#quote-location").fill("Dodoma — QA test venue");
  await page.locator("#quote-guestCount").fill("80");
  await page
    .getByRole("button", { name: "Save a draft on this device", exact: true })
    .click();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Resume draft", exact: true }).click();
  await expect(page.locator("#quote-location")).toHaveValue(
    "Dodoma — QA test venue",
  );
  await audit("/request-quotation", "requirements");
  check("Opt-in browser draft saving and resume preserve requirements");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Lunch or dinner buffet", { exact: true }).check();
  await page.locator("#quote-serviceStyle").selectOption("Buffet");
  await page
    .locator("#quote-dietary")
    .fill("Vegetarian options. Synthetic QA details only.");
  await page
    .locator("#quote-message")
    .fill(
      "Automated QA preview inquiry. Please remove this synthetic test record after verification.",
    );
  await audit("/request-quotation", "catering preferences");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator("#quote-name-error")).toBeVisible();
  await page.locator("#quote-name").fill("QA Preview Customer");
  await page.locator("#quote-organization").fill("Example Test Organization");
  await page.locator("#quote-email").fill("qa-preview@example.test");
  await page.locator("#quote-phone").fill("+255 700 000 001");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".review-step")).toContainText("80");
  await expect(page.locator(".review-step")).toContainText(
    "Catering & food services",
  );
  await audit("/request-quotation", "review");
  await page
    .getByRole("button", { name: "Send my request", exact: true })
    .click();
  await expect(page.locator("#quote-consent-error")).toBeVisible();
  await page.locator("#quote-consent").check();
  const responsePromise = page.waitForResponse(
    (res) =>
      res.url().endsWith("/api/inquiries") && res.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Send my request", exact: true })
    .click();
  const response = await responsePromise;
  assert.equal(response.status(), 201, JSON.stringify(await response.json()));
  await expect(page.locator(".reference-box strong")).toBeVisible();
  const reference = await page.locator(".reference-box strong").textContent();
  assert.match(reference, /^TOC-\d{4}-[A-F0-9]{8}$/);
  createdReferences.push(reference);
  await expect(page.locator(".success-panel")).toContainText(
    "No email has been sent",
  );
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download summary", exact: true })
    .click();
  const download = await downloadPromise;
  assert.ok(readFileSync(await download.path(), "utf8").includes(reference));
  assert.equal(
    await page.evaluate(() => localStorage.getItem("toc-inquiry-draft-v1")),
    null,
  );
  await audit("/request-quotation", "success");
  check(
    "Five-step inquiry validates, persists, returns a reference and downloads a summary",
  );

  const anonymous = await context.request.get(base + "/api/staff/inquiries");
  assert.equal(anonymous.status(), 401);
  if (password) {
    await go("/staff");
    await page.locator("#staff-password").fill(password);
    await page
      .getByRole("button", { name: "Sign in securely", exact: true })
      .click();
    await expect(page.locator(".staff-app")).toBeVisible();
    await page.getByRole("button", { name: reference, exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("QA Preview Customer");
    const apiRows = await (
      await context.request.get(base + "/api/staff/inquiries")
    ).json();
    const record = apiRows.inquiries.find((r) => r.reference === reference);
    assert.ok(record);
    const invalidTransition = await context.request.patch(
      base + `/api/staff/inquiries/${record.id}`,
      { data: { status: "closed" } },
    );
    assert.equal(invalidTransition.status(), 409);
    await page
      .getByRole("button", { name: "Mark in review", exact: true })
      .click();
    await expect(page.getByRole("dialog").locator(".status-badge")).toHaveText(
      "In review",
    );
    await page
      .getByRole("button", { name: "Mark contacted", exact: true })
      .click();
    await expect(page.getByRole("dialog").locator(".status-badge")).toHaveText(
      "Contacted",
    );
    await page
      .getByRole("button", { name: "Mark closed", exact: true })
      .click();
    await expect(page.getByRole("dialog").locator(".status-badge")).toHaveText(
      "Closed",
    );
    await page
      .getByRole("button", { name: "Close inquiry details", exact: true })
      .click();
    await page.screenshot({
      path: "research/final-staff-inbox.png",
      fullPage: true,
    });
    await audit("/staff", "authenticated inbox");
    await page
      .getByRole("searchbox", { name: "Search inquiries", exact: true })
      .fill(reference);
    await expect(page.locator(".staff-table tbody tr")).toHaveCount(1);
    const exportPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV", exact: true }).click();
    const csv = await exportPromise;
    assert.ok(readFileSync(await csv.path(), "utf8").includes(reference));
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page.locator("#staff-password")).toBeVisible();
    assert.equal(
      (await context.request.get(base + "/api/staff/inquiries")).status(),
      401,
    );
    check(
      "Staff authentication, protected records, validated transitions, CSV and logout",
    );
  } else
    check(
      "Staff mutation checks skipped: run npm run setup:staff to configure local credentials",
    );

  await go("/contact");
  await page.locator("#contact-name").fill("QA Contact Preview");
  await page.locator("#contact-email").fill("qa-contact@example.test");
  await page
    .locator("#contact-message")
    .fill("Synthetic contact message for website QA only.");
  await page.locator("#contact-consent").check();
  await page
    .getByRole("button", { name: "Send your message", exact: true })
    .click();
  await expect(page.locator(".reference-box strong")).toBeVisible();
  createdReferences.push(
    await page.locator(".reference-box strong").textContent(),
  );
  check(
    "Contact form persists a distinct inquiry without requiring an optional phone",
  );

  const invalid = await context.request.post(base + "/api/inquiries", {
    data: { origin: "quotation", service: "ict-solutions", consent: false },
  });
  assert.equal(invalid.status(), 422);
  const oversized = await context.request.post(base + "/api/inquiries", {
    data: { message: "x".repeat(26000) },
  });
  assert.equal(oversized.status(), 413);
  const crossSite = await context.request.post(base + "/api/inquiries", {
    headers: { Origin: "https://unrelated.example.test" },
    data: {},
  });
  assert.equal(crossSite.status(), 403);
  const limiterAddress = `198.51.100.${20 + Math.floor(Math.random() * 200)}`;
  for (let i = 0; i < 9; i++) {
    const response = await context.request.post(base + "/api/inquiries", {
      headers: { "X-Forwarded-For": limiterAddress },
      data: {},
    });
    assert.equal(response.status(), i < 8 ? 422 : 429);
  }
  check(
    "API rejects unapproved services, invalid consent, oversized bodies, cross-site origins and excessive requests",
  );
  const draftService = await context.request.get(
    base + "/services/ict-solutions",
  );
  assert.equal(draftService.status(), 404);
  const robots = await (await context.request.get(base + "/robots.txt")).text();
  assert.ok(robots.includes("Disallow: /"));
  check(
    "Unapproved service route remains unpublished and preview indexing is disabled",
  );
  assert.deepEqual(report.runtimeErrors, []);
  assert.equal(
    report.accessibility.flatMap((r) => r.violations).length,
    0,
    "Accessibility issues need review; see research/browser-report.json",
  );
  check(
    "No browser runtime errors and no automated WCAG A/AA violations in audited states",
  );
} catch (error) {
  failed = error;
  report.failure = error.stack || String(error);
  console.error("FAIL", error);
  try {
    await page.screenshot({
      path: "research/test-failure.png",
      fullPage: true,
    });
  } catch {}
} finally {
  await browser.close();
  // Remove only the synthetic records this invocation created, leaving real user data untouched.
  if (createdReferences.length && !process.env.TEST_BASE_URL) {
    const path =
      process.env.DATABASE_PATH ||
      localEnv.match(/^DATABASE_PATH=(.+)$/m)?.[1] ||
      "./data/toc.sqlite";
    const db = new Database(path);
    db.transaction(() => {
      for (const reference of createdReferences) {
        const row = db
          .prepare("SELECT id FROM inquiries WHERE reference=?")
          .get(reference);
        if (row) {
          db.prepare("DELETE FROM audit_logs WHERE inquiry_id=?").run(row.id);
          db.prepare("DELETE FROM inquiries WHERE id=?").run(row.id);
        }
      }
    })();
    db.close();
    report.syntheticRecordsRemoved = createdReferences.length;
  }
  report.finishedAt = new Date().toISOString();
  writeFileSync(
    "research/browser-report.json",
    JSON.stringify(report, null, 2),
  );
}
if (failed) process.exit(1);
console.log("ALL BROWSER CHECKS PASSED");
