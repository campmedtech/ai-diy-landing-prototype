import { cp, copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const outputDirectory = join(projectRoot, "docs");
const sourceFiles = ["index.html", "styles.css", "script.js"];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const sourceFile of sourceFiles) {
  await copyFile(join(projectRoot, sourceFile), join(outputDirectory, sourceFile));
}

await cp(join(projectRoot, "assets"), join(outputDirectory, "assets"), { recursive: true });

await writeFile(join(outputDirectory, ".nojekyll"), "", "utf8");

console.log(`Built ${sourceFiles.length} source files in docs/.`);
