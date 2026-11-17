import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { createApiContract } from "../scripts/lib/api-contract.mjs";
import { platformInputs } from "../lib/platform-api-schema";
import { z } from "zod";

const text = (path: string) => readFileSync(path, "utf8");
const coverage = JSON.parse(text("docs/blueprint-coverage.json"));
const spec = JSON.parse(text("docs/openapi.json"));
const expectedGroups = {
  FR: 13,
  AC: 10,
  DS: 14,
  SM: 10,
  NAV: 15,
  HP: 18,
  SD: 22,
  QE: 15,
  AI: 15,
  CMS: 18,
  QA: 16,
  UX: 15,
};
test("coverage accounts for each of the 181 supplied IDs once, with valid evidence and honest statuses", () => {
  assert.equal(coverage.source.pageCount, 159);
  assert.equal(coverage.requirements.length, 181);
  assert.equal(
    new Set(coverage.requirements.map((r: { id: string }) => r.id)).size,
    181,
  );
  for (const [prefix, count] of Object.entries(expectedGroups)) {
    const items = coverage.requirements.filter((r: { id: string }) =>
      r.id.startsWith(prefix + "-"),
    );
    assert.equal(items.length, count, prefix);
    for (let i = 0; i < count; i++) {
      const suffix =
        prefix === "SM"
          ? String(i + 1).padStart(2, "0")
          : String(i + (prefix === "AC" ? 201 : 1)).padStart(3, "0");
      assert.equal(items[i].id, `${prefix}-${suffix}`);
    }
  }
  for (const item of [...coverage.requirements, ...coverage.narrative]) {
    assert.ok(Object.hasOwn(coverage.statusLegend, item.status), item.id);
    assert.ok(item.implementation.length >= 20, item.id);
    assert.ok(item.evidence.length, item.id);
    for (const path of item.evidence)
      assert.ok(existsSync(path), `${item.id}: ${path}`);
    if (item.status !== "I")
      assert.ok(
        item.remaining.length >= 20,
        `${item.id}: incomplete acceptance must be disclosed`,
      );
  }
  for (const item of coverage.requirements) {
    assert.ok(item.page >= 1 && item.page <= 159);
    const escapedId = item.id.replaceAll("-", "\\-");
    assert.equal(
      (
        text("docs/BLUEPRINT-COVERAGE.md").match(
          new RegExp(`\\*\\*${escapedId}\\*\\* · p${item.page} \\|`, "g"),
        ) || []
      ).length,
      1,
      item.id,
    );
  }
  assert.ok(
    coverage.requirements.some((r: { status: string }) => r.status === "P"),
    "Never silently mark blueprint parity complete",
  );
});
test("narrative coverage reviews every physical PDF page and retains concrete implementation gaps", () => {
  const pages = coverage.narrative.flatMap(
    (item: { pages: [number, number] }) =>
      Array.from(
        { length: item.pages[1] - item.pages[0] + 1 },
        (_, i) => item.pages[0] + i,
      ),
  );
  assert.deepEqual(
    pages,
    Array.from({ length: 159 }, (_, i) => i + 1),
  );
  assert.equal(coverage.openItems.length, 12);
  for (const item of coverage.openItems) assert.ok(item.detail.length > 50);
  const matrix = text("docs/BLUEPRINT-COVERAGE.md");
  assert.ok(matrix.includes("not a claim that all are fully implemented"));
  assert.ok(matrix.includes("ICT & Cleaning"));
});
test("OpenAPI has unique operations, resolvable references, declared security and source-route coverage", () => {
  assert.equal(spec.openapi, "3.1.0");
  const ids = new Set<string>();
  for (const [path, methods] of Object.entries(spec.paths) as [
    string,
    Record<string, any>,
  ][]) {
    for (const [method, operation] of Object.entries(methods)) {
      assert.ok(["get", "post", "patch", "delete", "put"].includes(method));
      assert.ok(!ids.has(operation.operationId), operation.operationId);
      ids.add(operation.operationId);
      assert.ok(
        Object.keys(operation.responses).some((code) => /^2\d\d$/.test(code)),
        path,
      );
      for (const key of path.match(/\{[^}]+\}/g) || [])
        assert.ok(
          operation.parameters.some(
            (p: { name: string; in: string; required: boolean }) =>
              p.in === "path" && p.required && p.name === key.slice(1, -1),
          ),
          path,
        );
      for (const security of operation.security || [])
        for (const name of Object.keys(security))
          assert.ok(spec.components.securitySchemes[name], name);
    }
  }
  const walk = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if ("$ref" in value) {
      const ref = String(value.$ref);
      assert.ok(
        ref.startsWith("#/"),
        "Contract references must be self-contained",
      );
      let target: any = spec;
      for (const key of ref
        .slice(2)
        .split("/")
        .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))) {
        assert.ok(target && Object.hasOwn(target, key), ref);
        target = target[key];
      }
    }
    for (const child of Object.values(value)) walk(child);
  };
  walk(spec);
  for (const match of text("app/api/platform/[...path]/route.ts").matchAll(
    /route === "([^"]+)"/g,
  ))
    assert.ok(
      spec.paths["/api/platform/" + match[1]],
      `Undocumented source route: ${match[1]}`,
    );
  for (const path of [
    "inquiries/{id}",
    "content/{id}/history",
    "documents/{id}",
    "quotations/{id}/pdf",
    "public-media/{id}",
    "public-documents/{id}",
    "company-media/{id}",
  ])
    assert.ok(spec.paths["/api/platform/" + path], path);
  assert.ok(spec.paths["/api/staff/inquiries/{id}"].patch.deprecated);
  assert.equal(
    spec.components.securitySchemes.accountSession.name,
    "toc_account_session",
  );
  assert.equal(
    spec.paths["/api/inquiries"].post.responses[201].content["application/json"]
      .schema.$ref,
    "#/components/schemas/InquiryReceipt",
  );
});
test("OpenAPI/coverage rendering is reproducible, credential-free and does not initialize storage", () => {
  const directory = mkdtempSync(join(tmpdir(), "toc-documentation-"));
  try {
    const databasePath = join(directory, "must-not-create.sqlite");
    for (const [script, expected, output] of [
      ["generate-openapi.mts", "docs/openapi.json", "api.json"],
      ["generate-coverage.mts", "docs/BLUEPRINT-COVERAGE.md", "coverage.md"],
    ]) {
      const destination = join(directory, output);
      execFileSync(
        process.execPath,
        ["--import", "tsx", "scripts/" + script, destination],
        {
          encoding: "utf8",
          timeout: 30000,
          env: {
            ...process.env,
            DATABASE_PATH: databasePath,
            SMTP_PASS: "DOCUMENTATION-MUST-NOT-EMBED",
            SESSION_SECRET: "DOCUMENTATION-MUST-NOT-EMBED",
            AI_API_KEY: "DOCUMENTATION-MUST-NOT-EMBED",
          },
        },
      );
      assert.equal(
        text(destination),
        text(expected),
        `Run the documentation generator: ${script}`,
      );
      assert.ok(!text(destination).includes("DOCUMENTATION-MUST-NOT-EMBED"));
    }
    assert.equal(existsSync(databasePath), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
test("handover documents link only to existing local deliverables", () => {
  const files = [
    "README.md",
    "LAUNCH-CHECKLIST.md",
    "QA-RESULTS.md",
    "docs/API.md",
    "docs/BLUEPRINT-COVERAGE.md",
    "docs/STAFF-GUIDE.md",
    "docs/OPERATIONS.md",
    "docs/DESIGN-HANDOVER.md",
    "infrastructure/README.md",
  ];
  for (const file of files)
    for (const match of text(file).matchAll(/\]\(([^)]+)\)/g)) {
      const link = match[1];
      if (/^(?:https?:|mailto:|#)/.test(link)) continue;
      const path = resolve(dirname(file), link.split("#")[0]);
      assert.ok(existsSync(path), `${file}: broken handover link ${link}`);
    }
});

test("transport schemas are shared with runtime validation, including strict profiles and estimates", () => {
  for (const [name, schema] of Object.entries(platformInputs)) {
    const json = z.toJSONSchema(schema, {
      io: "input",
      unrepresentable: "any",
    });
    delete json.$schema;
    assert.deepEqual(spec.components.schemas[name], json, name);
  }
  assert.equal(spec.components.schemas.Profile.additionalProperties, false);
  assert.equal(
    spec.components.schemas.EstimateRequest.additionalProperties,
    false,
  );
  assert.equal(
    spec.components.schemas.SupplierSave.additionalProperties,
    false,
  );
});

test("all JSON response schemas compile; checks redact payloads and protect customer projections", () => {
  const contract = createApiContract(spec);
  contract.assertResponse({
    method: "GET",
    path: "/api/platform/health?token=DO-NOT-LOG",
    status: 200,
    contentType: "application/json; charset=utf-8",
    data: { status: "ok" },
  });
  contract.assertResponse({
    method: "GET",
    path: "/api/platform/portal",
    status: 401,
    contentType: "application/json",
    data: { error: "Sign in" },
  });
  assert.throws(
    () =>
      contract.assertResponse({
        method: "GET",
        path: "/api/platform/health?token=DO-NOT-LOG",
        status: 200,
        contentType: "application/json",
        data: { error: "SECRET-PAYLOAD" },
      }),
    (error) =>
      error instanceof Error &&
      error.message.includes("GET /api/platform/health 200") &&
      !/SECRET-PAYLOAD|DO-NOT-LOG/.test(error.message),
  );
  assert.equal(contract.summary().operations, 2);
  assert.ok(!JSON.stringify(contract.summary()).includes("DO-NOT-LOG"));
  assert.equal(
    spec.paths["/api/platform/auth/data-export"].get.responses[200].content[
      "application/json"
    ].schema.$ref,
    "#/components/schemas/DataExport",
  );
  assert.ok(
    spec.paths["/api/platform/public-documents/{id}"].get.responses[200]
      .content["application/pdf"],
  );
  assert.equal(
    spec.paths["/api/staff/inquiries"].get.responses[200].content[
      "application/json"
    ].schema.$ref,
    "#/components/schemas/LegacyInquiries",
  );
  for (const name of [
    "Portal",
    "CustomerWork",
    "CustomerQuote",
    "CustomerSnapshot",
    "CustomerLine",
    "CustomerBooking",
    "CustomerVisit",
    "CustomerProject",
    "DataExport",
  ])
    assert.equal(
      spec.components.schemas[name].additionalProperties,
      false,
      name,
    );
  assert.ok(
    !("priceRuleId" in spec.components.schemas.CustomerLine.properties),
  );
  assert.ok(
    !(
      "evidence" in
      spec.components.schemas.CustomerProject.properties.milestones.items
        .properties
    ),
  );
});
