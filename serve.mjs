import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const builtRoot = resolve(projectRoot, "docs");
const siteRoot = existsSync(builtRoot) ? builtRoot : projectRoot;
const port = Number.parseInt(process.env.PORT || "8001", 10);

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
]);

const server = createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Method Not Allowed");
    return;
  }

  const requestUrl = new URL(request.url || "/", "http://localhost");
  const requestedName = decodeURIComponent(requestUrl.pathname).replace(/^[/\\]+/, "") || "index.html";
  const requestedPath = resolve(siteRoot, requestedName);
  const relativePath = relative(siteRoot, requestedPath);

  if (relativePath.startsWith(`..${sep}`) || relativePath === "..") {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  if (!existsSync(requestedPath) || !statSync(requestedPath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
    return;
  }

  const contentType = contentTypes.get(extname(requestedPath).toLowerCase()) || "application/octet-stream";
  response.writeHead(200, { "Content-Type": contentType });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(requestedPath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`AI-DIY prototype running at http://localhost:${port}/`);
});
