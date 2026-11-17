// Test-only response-contract validation. Never logs or stores response payloads,
// cookies, concrete record IDs or query strings (which may contain link tokens).
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";

const escapePointer = (value) =>
  value.replaceAll("~", "~0").replaceAll("/", "~1");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function createApiContract(
  spec = JSON.parse(readFileSync("docs/openapi.json", "utf8")),
) {
  const id = "urn:toc:local-api-contract";
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  ajv.addSchema({ ...spec, $id: id });
  const entries = [];
  const validators = new Map();
  const checked = new Map();
  for (const [path, methods] of Object.entries(spec.paths)) {
    const pattern = new RegExp(
      "^" +
        path
          .split("/")
          .map((part) =>
            part.startsWith("{") && part.endsWith("}")
              ? "[^/]+"
              : escapeRegex(part),
          )
          .join("/") +
        "$",
      "u",
    );
    for (const [method, operation] of Object.entries(methods)) {
      for (const [status, response] of Object.entries(operation.responses)) {
        for (const [mime, content] of Object.entries(response.content || {})) {
          if (mime !== "application/json" || !content.schema) continue;
          // References are cached by their definition, so 700 error responses do
          // not recompile the same Error schema hundreds of times.
          const pointer =
            content.schema.$ref ||
            `#/paths/${escapePointer(path)}/${method}/responses/${status}/content/${escapePointer(mime)}/schema`;
          if (!validators.has(pointer))
            validators.set(pointer, ajv.getSchema(id + pointer));
        }
      }
      entries.push({ path, method, operation, pattern });
    }
  }
  return {
    describeOperation(method, path) {
      const pathname = new URL(path, "http://contract.invalid").pathname;
      const match = entries.find(
        (item) =>
          item.method === method.toLowerCase() && item.pattern.test(pathname),
      );
      return `${method.toUpperCase()} ${match ? match.path : "[undocumented operation]"}`;
    },
    assertResponse({ method, path, status, contentType, data }) {
      const pathname = new URL(path, "http://contract.invalid").pathname;
      const match = entries.find(
        (item) =>
          item.method === method.toLowerCase() && item.pattern.test(pathname),
      );
      if (!match)
        throw new Error("No documented operation for a tested API response.");
      const label = `${method.toUpperCase()} ${match.path} ${status}`;
      const response =
        match.operation.responses[String(status)] ||
        match.operation.responses.default;
      if (!response) throw new Error(`${label}: undocumented response status.`);
      const mime = (contentType || "").split(";")[0].trim().toLowerCase();
      const content = response.content?.[mime] || response.content?.["*/*"];
      if (response.content && !content)
        throw new Error(`${label}: undocumented response media type.`);
      if (mime === "application/json" && content?.schema) {
        const pointer =
          content.schema.$ref ||
          `#/paths/${escapePointer(match.path)}/${match.method}/responses/${status}/content/${escapePointer(mime)}/schema`;
        const validate = validators.get(pointer);
        if (!validate)
          throw new Error(`${label}: response schema could not be compiled.`);
        if (!validate(data))
          throw new Error(
            `${label}: ${validate.errors
              .slice(0, 3)
              .map((error) => `${error.instancePath || "/"} ${error.message}`)
              .join("; ")}`,
          );
      }
      checked.set(label, (checked.get(label) || 0) + 1);
    },
    summary() {
      return {
        operations: new Set(
          [...checked.keys()].map((key) => key.replace(/ \d{3}$/, "")),
        ).size,
        responses: [...checked.values()].reduce((sum, value) => sum + value, 0),
        cases: Object.fromEntries(
          [...checked.entries()].sort(([a], [b]) => a.localeCompare(b)),
        ),
      };
    },
  };
}
