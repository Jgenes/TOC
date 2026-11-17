// No server, secrets or customer data. Exercise the public export inside an opaque-origin viewer.
import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const html = readFileSync(
  process.argv[2] || "research/TOC-Website-Preview.html",
  "utf8",
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
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const report = {
  startedAt: new Date().toISOString(),
  checks: [],
  externalRequests: [],
  runtimeErrors: [],
};
page.on("pageerror", (error) => report.runtimeErrors.push(error.message));
page.on("request", (request) => {
  if (/^https?:/.test(request.url()))
    report.externalRequests.push(request.url());
});
const pass = (text) => {
  report.checks.push(text);
  console.log("PASS", text);
};
try {
  await page.setContent(
    '<iframe title="Portable website" sandbox="allow-scripts" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>',
  );
  const element = await page.locator("iframe").elementHandle();
  await element.evaluate((el, content) => {
    el.srcdoc = content;
  }, html);
  const frame = await element.contentFrame();
  await expect(frame.locator("h1")).toBeVisible({ timeout: 30000 });
  assert.equal(
    await frame.evaluate(() => location.origin),
    "null",
    "Preview must not depend on same-origin storage permissions",
  );
  await frame.locator('a[href="#/services"]').first().click();
  await expect(
    frame.locator(".service-detail-link, .service-card").first(),
  ).toBeVisible();
  const routes = [
    "/",
    "/about",
    "/services",
    "/services/event-management",
    "/services/catering",
    "/services/general-cleaning",
    "/services/ict-solutions",
    "/services/entertainment",
    "/services/cleaning",
    "/services/ict",
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
  ];
  const navigate = async (path) => {
    await frame.evaluate(
      (route) =>
        window.dispatchEvent(
          new CustomEvent("toc:navigate", { detail: route }),
        ),
      path,
    );
    await expect(frame.locator("h1")).toHaveCount(1);
    await frame.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    });
  };
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const language of ["en", "sw"]) {
      await frame
        .getByRole("button", { name: language.toUpperCase(), exact: true })
        .click();
      await expect(frame.locator("html")).toHaveAttribute("lang", language);
      for (const route of routes) {
        await navigate(route);
        const size = await frame.evaluate(() => ({
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
        }));
        assert.ok(
          size.document <= size.viewport + 1,
          `${language} ${width} ${route}: horizontal overflow`,
        );
        assert.equal(
          await frame
            .locator("img")
            .evaluateAll(
              (images) =>
                images.filter((image) => image.complete && !image.naturalWidth)
                  .length,
            ),
          0,
          `${route}: broken embedded image`,
        );
      }
      pass(
        `${routes.length} public/alias screens, ${language.toUpperCase()}, ${width}px, opaque iframe, no detected layout/image failure`,
      );
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await frame.getByRole("button", { name: "EN", exact: true }).click();
  await navigate("/gallery");
  await frame.getByRole("button", { name: "Catering", exact: true }).click();
  await expect(frame.locator(".gallery-item")).toHaveCount(3);
  await frame.locator(".gallery-item").first().click();
  await expect(frame.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(frame.getByRole("dialog")).toHaveCount(0);
  await expect(frame.locator(".gallery-item").first()).toBeFocused();
  pass("Embedded gallery filters, lightbox, Escape and focus restoration");
  await navigate("/request-quotation?service=ict-solutions");
  await frame.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(frame.locator("#quote-ictCategory")).toBeVisible();
  await expect(frame.locator(".draft-actions")).toBeHidden();
  await expect(frame.locator(".account-draft-controls")).toBeHidden();
  await navigate("/request-quotation?service=general-cleaning");
  await frame.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(frame.locator("#quote-propertyType")).toBeVisible();
  pass(
    "ICT and Cleaning deep-link preselection and offline draft/estimator boundaries",
  );
  await navigate("/portal");
  await expect(frame.locator("h1")).toHaveText("The protected TOC platform.");
  await expect(frame.getByLabel("Password", { exact: true })).toHaveCount(0);
  await navigate("/contact");
  await frame.locator("#contact-name").fill("Synthetic portable example");
  await frame.locator("#contact-email").fill("portable@example.test");
  await frame
    .locator("#contact-message")
    .fill("Synthetic offline test only. Never a real submission.");
  await frame.locator("#contact-consent").check();
  await frame
    .getByRole("button", { name: "Send your message", exact: true })
    .click();
  await expect(frame.locator(".form-error")).toContainText(
    "portable design preview",
  );
  await expect(frame.locator("#contact-name")).toHaveValue(
    "Synthetic portable example",
  );
  assert.deepEqual(
    report.externalRequests,
    [],
    "Portable design must make zero external network requests",
  );
  assert.deepEqual(report.runtimeErrors, [], "Portable runtime errors");
  pass(
    "Protected routes cannot sign in; offline submission is truthful, retains entries and makes zero network requests",
  );
  report.completedAt = new Date().toISOString();
  console.log(
    "ALL PORTABLE PREVIEW CHECKS PASSED — standalone public design, not a deployment.",
  );
} catch (error) {
  report.failure = error instanceof Error ? error.message : String(error);
  throw error;
} finally {
  mkdirSync("research", { recursive: true });
  writeFileSync(
    "research/portable-browser-report.json",
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
