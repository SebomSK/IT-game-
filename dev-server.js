/* Local-only static server for TicketQuest development (node dev-server.js). */
const http = require("http");
const fs = require("fs");
const path = require("path");
const ROOT = fs.realpathSync(__dirname);
const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT) || 8617;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function isWithinRoot(file) {
  const relative = path.relative(ROOT, file);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function hasHiddenSegment(file) {
  return path.relative(ROOT, file).split(path.sep).some((part) => part.startsWith("."));
}

function resolveRequestPath(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(String(requestUrl).split("?")[0]);
  } catch (error) {
    return null;
  }
  if (pathname === "/") pathname = "/index.html";
  const relativePath = pathname.replace(/^[/\\]+/, "");
  const file = path.resolve(ROOT, relativePath);
  if (!isWithinRoot(file) || hasHiddenSegment(file)) return null;
  return file;
}

function createServer() {
  return http.createServer((req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Cache-Control", "no-store");

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" });
      res.end();
      return;
    }

    const file = resolveRequestPath(req.url);
    if (!file) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }

    fs.realpath(file, (realpathError, realFile) => {
      if (realpathError) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      if (!isWithinRoot(realFile) || hasHiddenSegment(realFile)) {
        res.writeHead(403);
        res.end("forbidden");
        return;
      }
      fs.readFile(realFile, (readError, data) => {
        if (readError) {
          res.writeHead(404);
          res.end("not found");
          return;
        }
        res.writeHead(200, { "Content-Type": MIME[path.extname(realFile)] || "application/octet-stream" });
        res.end(req.method === "HEAD" ? undefined : data);
      });
    });
  });
}

if (require.main === module) {
  createServer().listen(PORT, HOST, () => console.log(`ticketquest dev server on http://${HOST}:${PORT}`));
}

module.exports = { createServer, resolveRequestPath };
