// Deterministic, credential-free rendering of the reviewed blueprint coverage registry.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

type Status = "I" | "P" | "C" | "O";
type Requirement = {
  id: string;
  page: number;
  requirement: string;
  status: Status;
  implementation: string;
  evidence: string[];
  remaining: string;
};
type Narrative = {
  id: string;
  pages: [number, number];
  status: Status;
  subject: string;
  implementation: string;
  evidence: string[];
  remaining: string;
};
const registry = JSON.parse(
  readFileSync("docs/blueprint-coverage.json", "utf8"),
) as {
  source: {
    fileName: string;
    pageCount: number;
    reviewDate: string;
    explicitRequirementCount: number;
    note: string;
  };
  statusLegend: Record<Status, string>;
  requirements: Requirement[];
  narrative: Narrative[];
  openItems: { id: string; subject: string; state: string; detail: string }[];
};
const cell = (text: string) =>
  text.replaceAll("|", "\\|").replaceAll("\n", " ");
const evidence = (paths: string[]) =>
  paths.map((path) => `[\`${path}\`](../${path})`).join(" · ");
const counts = Object.fromEntries(
  Object.keys(registry.statusLegend).map((status) => [
    status,
    registry.requirements.filter((item) => item.status === status).length,
  ]),
);
let output = `# Blueprint coverage and remaining work\n\n**Review date: ${registry.source.reviewDate}. Source: ${registry.source.fileName}, all ${registry.source.pageCount} PDF pages.**\n\nThe owner's instruction to include **ICT & Cleaning** is applied across the public catalogue, validation, routing, mail, commercial review and delivery modules. The former proposed/unpublished status in the document does not override that instruction.\n\n**All ${registry.requirements.length} explicit requirement IDs are accounted for below; this is not a claim that all are fully implemented, approved or production-ready.** The document also contains requirements outside those ID tables. The narrative register reviews every page, and the open-item register identifies genuine implementation gaps, configuration dependencies and decisions rather than marking them complete. No production deployment, merger, live provider activation or business sign-off is implied.\n\n## How to read this report\n\n`;
for (const [status, definition] of Object.entries(registry.statusLegend))
  output += `- **${status}** — ${definition}\n`;
output += `\nExplicit-ID status counts: **${counts.I} I · ${counts.P} P · ${counts.C} C · ${counts.O} O**. These are review categories, **not** a compliance percentage or a count of certified features. An I row still depends on the global content, legal, security and hosting launch gates.\n\nEvidence links point to the implementation or repeatable checks, not real customer/equipment evidence. Synthetic fixtures, credentials, the source PDF, generated HTML and local browser reports are deliberately excluded from Git. Current executed results and limitations are in [QA-RESULTS.md](../QA-RESULTS.md). The machine-readable reviewed register is [blueprint-coverage.json](blueprint-coverage.json); regenerate this document with \`npm run docs:coverage\`.\n\n## Open implementation/acceptance items — do not silently treat these as complete\n\n`;
for (const item of registry.openItems)
  output += `### ${item.id} — ${item.subject}\n\n**${item.state}.** ${item.detail}\n\n`;
output += `## Narrative page review — requirements outside the numbered tables\n\nRanges are physical PDF pages and cover 1–159 without omissions. A whole-range status summarizes the weakest material part, not the absence of its implemented modules.\n\n| Pages | Area / status | Implementation and evidence | Remaining / alternative |\n| --- | --- | --- | --- |\n`;
for (const item of registry.narrative) {
  output += `| ${item.pages[0] === item.pages[1] ? item.pages[0] : item.pages.join("–")} | **${item.id} · ${item.status} — ${cell(item.subject)}** | ${cell(item.implementation)}<br>${evidence(item.evidence)} | ${cell(item.remaining) || "Global launch gates apply."} |\n`;
}
const names: Record<string, string> = {
  FR: "Functional requirements",
  AC: "Corporate/content acceptance",
  DS: "Design system",
  SM: "Sitemap areas",
  NAV: "Navigation and route acceptance",
  HP: "Homepage acceptance",
  SD: "Service-division acceptance",
  QE: "Quotation engine",
  AI: "Assistance safeguards and acceptance",
  CMS: "Content/administration acceptance",
  QA: "Quality/launch acceptance",
  UX: "Detailed UI/UX acceptance",
};
output += "\n## Explicit requirement IDs\n";
for (const [prefix, name] of Object.entries(names)) {
  const items = registry.requirements.filter((item) =>
    item.id.startsWith(prefix + "-"),
  );
  output += `\n### ${prefix} — ${name} (${items.length})\n\n| ID / page | Document requirement / acceptance method | Status | Implementation / evidence | Remaining / qualification |\n| --- | --- | :---: | --- | --- |\n`;
  for (const item of items)
    output += `| **${item.id}** · p${item.page} | ${cell(item.requirement)} | **${item.status}** | ${cell(item.implementation)}<br>${evidence(item.evidence)} | ${cell(item.remaining) || "Global launch gates apply."} |\n`;
}
output +=
  "\n## Related handover\n\n- [Staff workflows](STAFF-GUIDE.md)\n- [API/data model](API.md) and [OpenAPI 3.1](openapi.json)\n- [Deployment architecture/templates](../infrastructure/README.md)\n- [Operations/security/privacy/recovery](OPERATIONS.md)\n- [Design system and screen inventory](DESIGN-HANDOVER.md)\n- [Launch sign-off checklist](../LAUNCH-CHECKLIST.md)\n\nThe report is intentionally candid: code presence, a passing synthetic test, a management attestation, configured infrastructure and independently verified production acceptance are different things.\n";
const destination = process.argv[2] || "docs/BLUEPRINT-COVERAGE.md";
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, output);
console.log(
  `Coverage rendered: ${registry.requirements.length} explicit IDs, ${registry.narrative.length} narrative ranges, ${registry.openItems.length} open-item groups.`,
);
