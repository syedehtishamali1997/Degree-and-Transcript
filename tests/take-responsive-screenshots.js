import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const DIST_DIR = path.resolve(process.cwd(), "dist");
const SCREENSHOTS_DIR = path.resolve(process.cwd(), "responsive-screenshots");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

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
      res.end(`Error: ${err.code}`);
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
});

const PORT = 8099;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const VIEWPORTS = [
  { name: "1920x1080_Large_Desktop", width: 1920, height: 1080 },
  { name: "1440x900_Desktop", width: 1440, height: 900 },
  { name: "1366x768_Laptop", width: 1366, height: 768 },
  { name: "1024x768_Tablet_Landscape", width: 1024, height: 768 },
  { name: "768x1024_Tablet_Portrait", width: 768, height: 1024 },
  { name: "430x932_Large_Mobile", width: 430, height: 932 },
  { name: "390x844_Standard_Mobile", width: 390, height: 844 },
  { name: "375x812_iPhone", width: 375, height: 812 },
  { name: "320x568_Small_Mobile", width: 320, height: 568 }
];

server.listen(PORT, async () => {
  console.log(`Responsive test server listening on http://localhost:${PORT}`);

  try {
    for (const vp of VIEWPORTS) {
      const outPath = path.join(SCREENSHOTS_DIR, `dashboard_${vp.name}.png`);
      const cmd = `"${CHROME_PATH}" --headless=new --screenshot="${outPath}" --window-size=${vp.width},${vp.height} --hide-scrollbars "http://localhost:${PORT}/#/dashboard"`;
      console.log(`Capturing ${vp.name} (${vp.width}x${vp.height})...`);
      execSync(cmd, { stdio: "ignore" });
    }

    console.log(`\nSuccessfully captured all ${VIEWPORTS.length} viewport screenshots in responsive-screenshots/!`);
  } catch (err) {
    console.error("Screenshot error:", err);
  } finally {
    server.close(() => process.exit(0));
  }
});
