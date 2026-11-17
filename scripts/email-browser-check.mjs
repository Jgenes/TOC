// UI-only regression checks: every form POST is intercepted, so no inquiry is saved
// and no SMTP notification is sent. Run against a local preview server.
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? {
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
});
const page = await context.newPage();
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(error.message));
const reference = "TOC-2026-AABBCCDD";
const states = [
  {
    status: "preview_local_only",
    en: "No email has been sent",
    sw: "Hakuna barua pepe iliyotumwa wala nafasi",
  },
  {
    status: "email_sent",
    en: "saved and emailed to info@tocinvestment.co.tz",
    sw: "limehifadhiwa na kutumwa kwa barua pepe",
  },
  {
    status: "email_failed",
    en: "You do not need to submit again",
    sw: "Huhitaji kutuma ombi tena",
  },
  {
    status: "saved_for_review",
    en: "No automatic email was sent",
    sw: "Hakuna barua pepe iliyotumwa moja kwa moja",
  },
];

try {
  for (const form of ["contact", "quotation"]) {
    for (const state of states) {
      let submitted;
      let requests = 0;
      await page.route("**/api/inquiries", async (route) => {
        submitted = route.request().postDataJSON();
        requests++;
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            reference,
            createdAt: "2026-11-17T06:00:00.000Z",
            deliveryStatus: state.status,
          }),
        });
      });
      await page.setViewportSize({ width: 1440, height: 1050 });
      await page.goto(
        base +
          (form === "contact"
            ? "/contact"
            : "/request-quotation?service=catering"),
        { waitUntil: "networkidle" },
      );
      await page.getByRole("button", { name: "EN", exact: true }).click();
      if (form === "contact") {
        await page.locator("#contact-name").fill("Synthetic UI Customer");
        await page.locator("#contact-email").fill("ui-customer@example.test");
        await page
          .locator("#contact-message")
          .fill("Synthetic UI check; never sent to SMTP.");
        await page.locator("#contact-consent").check();
        await page
          .getByRole("button", { name: "Send your message", exact: true })
          .click();
      } else {
        const next = () =>
          page.getByRole("button", { name: "Continue", exact: true }).click();
        await next();
        await page.locator("#quote-location").fill("Synthetic Dodoma venue");
        await page.locator("#quote-region").selectOption("Dodoma");
        await page.locator("#quote-eventType").selectOption("Corporate event");
        await page.locator("#quote-guestCount").fill("100");
        await next();
        await page
          .getByLabel("Menu guidance requested", { exact: true })
          .check();
        await page.locator("#quote-serviceStyle").selectOption("discuss");
        await next();
        await page.locator("#quote-name").fill("Synthetic UI Customer");
        await page.locator("#quote-email").fill("ui-customer@example.test");
        await page.locator("#quote-phone").fill("+255 700 000 001");
        await next();
        await page.locator("#quote-consent").check();
        await page
          .getByRole("button", { name: "Send my request", exact: true })
          .click();
      }
      const panel = page.locator(".success-panel");
      await expect(panel).toContainText(state.en);
      await expect(panel.locator(".reference-box strong")).toHaveText(
        reference,
      );
      assert.equal(requests, 1);
      assert.equal(submitted.origin, form);
      assert.equal(submitted.email, "ui-customer@example.test");
      await expect(panel.locator("a.button-primary")).toHaveAttribute(
        "href",
        /^mailto:info@tocinvestment\.co\.tz\?/,
      );
      await expect(panel.locator("a.button-primary")).toHaveText(
        state.status === "email_sent"
          ? "Open a follow-up draft"
          : "Email this to TOC",
      );
      if (state.status !== "email_sent") {
        await expect(panel).not.toContainText("saved and emailed");
      }
      await page.getByRole("button", { name: "SW", exact: true }).click();
      await expect(panel).toContainText(state.sw);
      await page.setViewportSize({ width: 320, height: 844 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      assert.equal(
        overflow,
        false,
        `${form}/${state.status} overflows at 320px`,
      );
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      assert.deepEqual(
        audit.violations,
        [],
        `${form}/${state.status} accessibility`,
      );
      await page.unroute("**/api/inquiries");
      console.log(
        `PASS ${form}: ${state.status}, EN/SW, 320px and accessibility`,
      );
    }
  }
  assert.deepEqual(runtimeErrors, []);
} finally {
  await browser.close();
}
console.log(
  "ALL EMAIL STATUS UI CHECKS PASSED (mocked responses; no email sent)",
);
