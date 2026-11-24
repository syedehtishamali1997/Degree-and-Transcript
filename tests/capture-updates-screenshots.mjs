/**
 * tests/capture-updates-screenshots.mjs
 * Captures visual artifact screenshots for:
 * 1. Login Screen (/login)
 * 2. Dynamic Branding Card in Settings (/settings)
 * 3. User Management & Access Control (/users)
 * 4. Role Permissions Matrix Tab (/users)
 * 5. Table wrapping on student cases table
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACTS_DIR = "C:\\Users\\ehtisham.ali\\.gemini\\antigravity\\brain\\c9d0ffe0-251c-4ddb-a2db-3a58235ee952";
const tempProfile = path.join(os.tmpdir(), "casetrack_scr_" + Date.now());

async function capture() {
  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9230",
    `--user-data-dir=${tempProfile}`,
    "--disable-gpu",
    "--window-size=1440,900",
    "about:blank"
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  try {
    const listRes = await fetch("http://127.0.0.1:9230/json/list");
    const targets = await listRes.json();
    const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
    await new Promise((r) => (ws.onopen = r));

    let msgId = 1;
    const pending = new Map();
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send("Page.enable");
    await send("Runtime.enable");

    // 1. Capture Login Screen (before token is injected)
    console.log("Navigating to http://localhost:5000/#/login...");
    await send("Page.navigate", { url: "http://localhost:5000/#/login" });
    await new Promise((r) => setTimeout(r, 2000));

    const loginShot = await send("Page.captureScreenshot", { format: "png" });
    const loginPath = path.join(ARTIFACTS_DIR, "casetrack-login-screen.png");
    fs.writeFileSync(loginPath, Buffer.from(loginShot.result.data, "base64"));
    console.log(`Saved screenshot: ${loginPath}`);

    // Now inject auth token
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `try { localStorage.setItem("casetrack_auth_token", "casetrack-e2e-test-token"); } catch(e){}`
    });
    await send("Runtime.evaluate", {
      expression: `try { localStorage.setItem("casetrack_auth_token", "casetrack-e2e-test-token"); } catch(e){}`
    });

    // 2. Capture Settings Page (Dynamic Branding Card)
    console.log("Navigating to http://localhost:5000/#/settings...");
    await send("Page.navigate", { url: "http://localhost:5000/#/settings" });
    await new Promise((r) => setTimeout(r, 2200));

    const settingsShot = await send("Page.captureScreenshot", { format: "png" });
    const settingsPath = path.join(ARTIFACTS_DIR, "casetrack-settings-branding.png");
    fs.writeFileSync(settingsPath, Buffer.from(settingsShot.result.data, "base64"));
    console.log(`Saved screenshot: ${settingsPath}`);

    // 3. Capture User Management Directory (/users)
    console.log("Navigating to http://localhost:5000/#/users...");
    await send("Page.navigate", { url: "http://localhost:5000/#/users" });
    await new Promise((r) => setTimeout(r, 2200));

    const usersShot = await send("Page.captureScreenshot", { format: "png" });
    const usersPath = path.join(ARTIFACTS_DIR, "casetrack-user-management.png");
    fs.writeFileSync(usersPath, Buffer.from(usersShot.result.data, "base64"));
    console.log(`Saved screenshot: ${usersPath}`);

    // 4. Capture Role Permissions Matrix Tab
    console.log("Switching to Role Permissions Matrix Tab...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const tab = Array.from(document.querySelectorAll('.nav-link')).find(b => b.innerText.includes('Role Permissions'));
          if (tab) tab.click();
        })()
      `
    });
    await new Promise((r) => setTimeout(r, 1200));

    const matrixShot = await send("Page.captureScreenshot", { format: "png" });
    const matrixPath = path.join(ARTIFACTS_DIR, "casetrack-rbac-matrix.png");
    fs.writeFileSync(matrixPath, Buffer.from(matrixShot.result.data, "base64"));
    console.log(`Saved screenshot: ${matrixPath}`);

    // 5. Capture Table Text-Wrapping on Pending Cases
    console.log("Navigating to http://localhost:5000/#/students/pending...");
    await send("Page.navigate", { url: "http://localhost:5000/#/students/pending" });
    await new Promise((r) => setTimeout(r, 2000));

    const tableShot = await send("Page.captureScreenshot", { format: "png" });
    const tablePath = path.join(ARTIFACTS_DIR, "casetrack-table-wrapping.png");
    fs.writeFileSync(tablePath, Buffer.from(tableShot.result.data, "base64"));
    console.log(`Saved screenshot: ${tablePath}`);

    ws.close();
  } finally {
    try {
      chromeProc.kill("SIGKILL");
    } catch {}
    try {
      fs.rmSync(tempProfile, { recursive: true, force: true });
    } catch {}
  }
}

capture().catch((e) => {
  console.error("Screenshot capture failed:", e);
  process.exit(1);
});
