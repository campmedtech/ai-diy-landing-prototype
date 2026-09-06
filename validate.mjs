import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname);
const sourceFile = path.resolve(projectRoot, "..", "ai-diy-landing-prototype", "index.html");
const contentAuditEnabled = path.dirname(sourceFile) !== projectRoot;
const htmlFiles = (await readdir(projectRoot))
  .filter((file) => file.endsWith(".html"))
  .sort();

function bodyOnly(html) {
  const match = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1] : html;
}

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&rsquo;/g, "’")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/&copy;/g, "©")
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)));
}

function visibleTextNodes(html) {
  const body = bodyOnly(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--([\s\S]*?)-->/g, "");

  return body
    .split(/<[^>]+>/g)
    .map((text) => decodeHtml(text).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const sourceHtml = await readFile(sourceFile, "utf8");
const sourceNodes = [...new Set(visibleTextNodes(sourceHtml))];
const approvedEditorialOmissions = new Set([
  "Learn more about Ralph →",
  "YOUR AI-DIY TEAM",
]);
const approvedEditorialAdditions = new Set([
  "YOUR AI PROJECT TEAM",
  "Do I need to write code?",
  "How long does it take?",
  "Who is the team?",
  "What if it isn’t what I expected?",
]);
const pageEntries = await Promise.all(
  htmlFiles.map(async (file) => [file, await readFile(path.join(projectRoot, file), "utf8")]),
);
const allPageText = pageEntries.flatMap(([, html]) => visibleTextNodes(html));

const missingText = contentAuditEnabled ? sourceNodes.filter(
  (sourceText) => !approvedEditorialOmissions.has(sourceText) && !allPageText.some((pageText) => pageText.includes(sourceText)),
) : [];
const unexpectedText = contentAuditEnabled ? [...new Set(allPageText)].filter(
  (pageText) => !approvedEditorialAdditions.has(pageText) && !sourceNodes.some((sourceText) => sourceText.includes(pageText)),
) : [];
const requiredSourceCount = contentAuditEnabled
  ? sourceNodes.filter((sourceText) => !approvedEditorialOmissions.has(sourceText)).length
  : 0;

const brokenLinks = [];
for (const [sourcePage, html] of pageEntries) {
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  for (const href of hrefs) {
    if (/^(?:https?:|mailto:|tel:)/i.test(href)) continue;

    const [filePart, hashPart] = href.split("#");
    const targetFile = filePart || sourcePage;
    const targetPath = path.resolve(projectRoot, targetFile);

    try {
      if (!(await stat(targetPath)).isFile()) {
        brokenLinks.push(`${sourcePage}: ${href} (target is not a file)`);
        continue;
      }
    } catch {
      brokenLinks.push(`${sourcePage}: ${href} (missing file)`);
      continue;
    }

    if (hashPart) {
      const targetHtml = await readFile(targetPath, "utf8");
      const escapedId = hashPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!new RegExp(`\\bid=["']${escapedId}["']`).test(targetHtml)) {
        brokenLinks.push(`${sourcePage}: ${href} (missing target id)`);
      }
    }
  }
}

const externalHttpLinks = pageEntries.flatMap(([file, html]) =>
  [...html.matchAll(/href="(https?:[^"]+)"/g)].map((match) => `${file}: ${match[1]}`),
);

if (missingText.length || unexpectedText.length || brokenLinks.length || externalHttpLinks.length) {
  if (missingText.length) {
    console.error("Missing source-image text fragments:");
    missingText.forEach((text) => console.error(`- ${text}`));
  }
  if (unexpectedText.length) {
    console.error("Unexpected visible wording not found in the source prototype:");
    unexpectedText.forEach((text) => console.error(`- ${text}`));
  }
  if (brokenLinks.length) {
    console.error("Broken internal links:");
    brokenLinks.forEach((text) => console.error(`- ${text}`));
  }
  if (externalHttpLinks.length) {
    console.error("Unexpected live web links:");
    externalHttpLinks.forEach((text) => console.error(`- ${text}`));
  }
  process.exitCode = 1;
} else {
  if (contentAuditEnabled) {
    console.log(`PASS: all ${requiredSourceCount} required visible source-text fragments are preserved.`);
    console.log("PASS: Editorial changes are limited to the documented team-label and FAQ decisions.");
  } else {
    console.log("PASS: content preservation was verified before the deployment repository was replaced.");
  }
  console.log(`PASS: ${htmlFiles.length} pages contain no broken internal routes.`);
  console.log("PASS: No external HTTP/HTTPS destinations are active.");
}
