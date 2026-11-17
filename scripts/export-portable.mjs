import { build } from "esbuild";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
const result = await build({
  entryPoints: ["portable/app.tsx"],
  bundle: true,
  minify: true,
  write: false,
  platform: "browser",
  format: "iife",
  target: ["es2020"],
  jsx: "automatic",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.NEXT_PUBLIC_PREVIEW_MODE": '"true"',
  },
  alias: {
    "next/link": resolve("portable/link.tsx"),
    "next/navigation": resolve("portable/navigation.tsx"),
    "@": resolve("."),
  },
  logLevel: "silent",
});
let js = result.outputFiles[0].text;
const imageMime = (name) =>
  name.endsWith(".webp")
    ? "image/webp"
    : name.endsWith(".svg")
      ? "image/svg+xml"
      : "image/png";
for (const name of readdirSync("public/assets")) {
  const path = `/assets/${name}`;
  js = js.replaceAll(
    path,
    `data:${imageMime(name)};base64,${readFileSync("public" + path).toString("base64")}`,
  );
}
js = js.replaceAll(
  "Preview only. Use test details. Requests are saved in this preview, not sent to TOC.",
  "Portable design preview. Form submission requires the live website. Do not enter real personal details here.",
);
js = js.replaceAll(
  "Hakikisho pekee. Tumia taarifa za majaribio. Maombi yanahifadhiwa hapa, hayatumwi kwa TOC.",
  "Hakikisho la muundo pekee. Kutuma ombi kunahitaji tovuti inayoendeshwa. Usitumie taarifa halisi hapa.",
);
let css =
  readFileSync("app/globals.css", "utf8") +
  "\n" +
  readFileSync("app/platform.css", "utf8");
for (const name of readdirSync("public/fonts").filter((n) =>
  n.endsWith(".woff2"),
)) {
  css = css.replaceAll(
    `/fonts/${name}`,
    `data:font/woff2;base64,${readFileSync(`public/fonts/${name}`).toString("base64")}`,
  );
}
css +=
  "\n.offline-banner{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;background:#f7f3ec;color:#73604b;padding:8px 20px;text-align:center;font:10px/1.6 Inter,Arial,sans-serif;border-bottom:1px solid #eae1d3}.offline-banner strong{font-size:8px;letter-spacing:1px;color:#a32930}.draft-actions,.local-draft-note,.draft-notice,.account-draft-controls,.estimate-planner{display:none!important}@media(max-width:700px){.offline-banner{display:block;font-size:9px;padding:8px 17px}.offline-banner strong{display:block;margin-bottom:3px;font-size:8px}}";
const favicon =
  "data:image/svg+xml;base64," +
  readFileSync("public/favicon.svg").toString("base64");
const html = `<!doctype html><html lang="en" data-scroll-behavior="smooth"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#c91f2a"><title>TOC Investment — A Touch of Class</title><meta name="description" content="Portable TOC website design preview. Form submission and staff access require the running website."><link rel="icon" href="${favicon}"><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll("</script", "<\\/script")}</script></body></html>`;
const destination = process.argv[2] || "research/TOC-Website-Preview.html";
writeFileSync(destination, html);
console.log(
  `Portable website saved to ${destination} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB). All public pages, fonts, images and scripts are embedded.`,
);
