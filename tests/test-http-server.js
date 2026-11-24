import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

const PORT = 8089;
const DIST_DIR = path.resolve(process.cwd(), "dist");

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split("?")[0];
  let filePath = path.join(DIST_DIR, urlPath === "/" ? "index.html" : urlPath);

  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, "index.html");
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end(`Server Error: ${err.code}`);
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
});

server.listen(PORT, async () => {
  console.log(`Test HTTP server listening on port ${PORT}...`);

  try {
    // 1. Fetch index.html
    const res = await fetch(`http://localhost:${PORT}/`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("CaseTrack"));
    assert.ok(html.includes('<div id="root"></div>'));
    console.log("[PASS] Root index.html successfully served and verified.");

    // 2. Fetch CSS asset
    const cssMatch = html.match(/href="([^"]+\.css)"/);
    if (cssMatch) {
      const cssRes = await fetch(`http://localhost:${PORT}/${cssMatch[1].replace(/^\.\//, "")}`);
      assert.strictEqual(cssRes.status, 200);
      console.log(`[PASS] CSS asset (${cssMatch[1]}) successfully loaded.`);
    }

    // 3. Fetch JS asset
    const jsMatch = html.match(/src="([^"]+\.js)"/);
    if (jsMatch) {
      const jsRes = await fetch(`http://localhost:${PORT}/${jsMatch[1].replace(/^\.\//, "")}`);
      assert.strictEqual(jsRes.status, 200);
      console.log(`[PASS] JS asset (${jsMatch[1]}) successfully loaded.`);
    }

    console.log("\nAll HTTP integration tests PASSED successfully!");
    server.close(() => process.exit(0));
  } catch (err) {
    console.error("Test failed:", err);
    server.close(() => process.exit(1));
  }
});
