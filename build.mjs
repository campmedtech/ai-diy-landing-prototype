import { cp, copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const outputDirectory = join(projectRoot, "docs");
const rootEntries = await readdir(projectRoot, { withFileTypes: true });
const sourceFiles = rootEntries
  .filter((entry) => entry.isFile() && [".html", ".css", ".js"].includes(extname(entry.name)))
  .map((entry) => entry.name);

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const sourceFile of sourceFiles) {
  await copyFile(join(projectRoot, sourceFile), join(outputDirectory, sourceFile));
}

await cp(join(projectRoot, "assets"), join(outputDirectory, "assets"), { recursive: true });

console.log(`Built ${sourceFiles.length} source files in docs/.`);
