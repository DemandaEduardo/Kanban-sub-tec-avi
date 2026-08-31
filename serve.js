const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.argv[2] ? Number(process.argv[2]) : 8081;
const root = __dirname;
const dataFile = path.join(root, "data.json");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

// Serializes writes so concurrent saves from different clients can't interleave and corrupt the file.
let writeQueue = Promise.resolve();

function serveState(res) {
  fs.readFile(dataFile, "utf8", (err, data) => {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(err ? "null" : data);
  });
}

function saveState(req, res) {
  let body = "";
  let tooLarge = false;
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 50 * 1024 * 1024) { tooLarge = true; req.destroy(); }
  });
  req.on("end", () => {
    if (tooLarge) return;
    try { JSON.parse(body); } catch (e) { res.writeHead(400); res.end("Invalid JSON"); return; }
    writeQueue = writeQueue
      .then(() => fs.promises.writeFile(dataFile, body, "utf8"))
      .then(() => {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end('{"ok":true}');
      })
      .catch(() => {
        res.writeHead(500);
        res.end("Write failed");
      });
  });
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);

  if (urlPath === "/api/state" && req.method === "GET") { serveState(res); return; }
  if (urlPath === "/api/state" && req.method === "POST") { saveState(req, res); return; }

  const filePath = path.join(root, urlPath === "/" ? "/index.html" : urlPath);
  if (!filePath.startsWith(root)) { res.writeHead(403); res.end("Forbidden"); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error("Porta " + port + " já está em uso — provavelmente o servidor já está rodando.");
    process.exit(0);
  }
  throw err;
});

server.listen(port, () => {
  console.log("Serving " + root + " at http://localhost:" + port);
});
