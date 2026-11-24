import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TEMP_PROFILE = path.join(os.tmpdir(), "casetrack_shot_" + Date.now());

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9232",
    `--user-data-dir=${TEMP_PROFILE}`,
    "--disable-gpu",
    "about:blank"
  ], { stdio: "pipe" });

  await new Promise(r => setTimeout(r, 2000));
  try {
    const listRes = await fetch("http://127.0.0.1:9232/json/list");
    const targets = await listRes.json();
    const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    const send = (method, params) => new Promise((res, rej) => {
      const cur = id++;
      const handler = (e) => {
        const d = JSON.parse(e.data);
        if (d.id === cur) {
          ws.removeEventListener("message", handler);
          res(d);
        }
      };
      ws.addEventListener("message", handler);
      ws.send(JSON.stringify({ id: cur, method, params }));
    });

    await send("Page.enable");
    await send("Page.navigate", { url: "http://localhost:5000/#/data-management" });
    await new Promise(r => setTimeout(r, 2500));

    if (!fs.existsSync("responsive-screenshots")) {
      fs.mkdirSync("responsive-screenshots", { recursive: true });
    }

    // Capture Desktop
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
    await new Promise(r => setTimeout(r, 500));
    const shotDesktop = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("responsive-screenshots/data-management-desktop-modern.png", Buffer.from(shotDesktop.result.data, "base64"));

    // Capture Mobile
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await new Promise(r => setTimeout(r, 500));
    const shotMobile = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("responsive-screenshots/data-management-mobile-modern.png", Buffer.from(shotMobile.result.data, "base64"));

    console.log("Modernized Data Management screenshots captured successfully!");
  } finally {
    try {
      chromeProc.kill();
      fs.rmSync(TEMP_PROFILE, { recursive: true, force: true });
    } catch {}
    process.exit(0);
  }
}
run();
