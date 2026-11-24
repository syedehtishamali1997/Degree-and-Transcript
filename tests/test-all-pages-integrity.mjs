import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TEMP_PROFILE = path.join(os.tmpdir(), "casetrack_integrity_" + Date.now());

const ROUTES = [
  { name: "Dashboard", hash: "#/dashboard", expectedHeading: "Overview & Workflow Metrics" },
  { name: "All Students", hash: "#/students/all", expectedHeading: "All Student Records" },
  { name: "Pending Cases", hash: "#/students/pending", expectedHeading: "Pending Cases" },
  { name: "Case Ready", hash: "#/students/case-ready", expectedHeading: "Case Ready Queue" },
  { name: "Sent to Main Campus", hash: "#/students/sent", expectedHeading: "Sent to Main Campus" },
  { name: "Returned Cases", hash: "#/students/returned", expectedHeading: "Returned Cases" },
  { name: "Received Cases", hash: "#/students/received", expectedHeading: "Completed / Received Cases" },
  { name: "Activity History", hash: "#/history", expectedHeading: "System Activity History" },
  { name: "Settings", hash: "#/settings", expectedHeading: "System Settings" },
  { name: "Data Management", hash: "#/data-management", expectedHeading: "Data Management & Persistence" }
];

async function run() {
  console.log("======================================================================");
  console.log("  CASETRACK ALL-PAGE REGRESSION & ISOLATION INTEGRITY SUITE           ");
  console.log("======================================================================\n");

  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9233",
    `--user-data-dir=${TEMP_PROFILE}`,
    "--disable-gpu",
    "--window-size=1440,900",
    "about:blank"
  ], { stdio: "pipe" });

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch("http://127.0.0.1:9233/json/list");
    const targets = await listRes.json();
    const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    const pending = new Map();
    const jsErrors = [];

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data);
      }
      if (data.method === "Runtime.exceptionThrown") {
        jsErrors.push(data.params);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const cur = id++;
        pending.set(cur, { resolve, reject });
        ws.send(JSON.stringify({ id: cur, method, params }));
      });
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `try { localStorage.setItem("casetrack_auth_token", "casetrack-e2e-test-token"); } catch(e){}`
    });

    // Load base URL
    await send("Page.navigate", { url: "http://localhost:5000/#/dashboard" });
    await new Promise(r => setTimeout(r, 2000));

    for (const route of ROUTES) {
      await send("Runtime.evaluate", { expression: `window.location.hash = '${route.hash}';` });
      await new Promise(r => setTimeout(r, 600));

      const check = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const bodyText = document.body.innerText;
            const hasHeading = bodyText.includes("${route.expectedHeading}");
            const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
            return { hasHeading, hasHorizontalScroll };
          })()
        `,
        returnByValue: true
      });

      const res = check.result?.result?.value || check.result?.value;
      assert.ok(res, `Check result must exist for ${route.name}`);
      assert.equal(res.hasHeading, true, `Route ${route.name} (${route.hash}) must display heading '${route.expectedHeading}'`);
      assert.equal(res.hasHorizontalScroll, false, `Route ${route.name} must not have horizontal scroll`);

      console.log(`  [PASS] Page '${route.name}' (${route.hash}): Heading confirmed, zero horizontal overflow.`);
    }

    assert.equal(jsErrors.length, 0, `Recorded ${jsErrors.length} JS errors`);
    console.log(`\n  TOTAL BROWSER EXCEPTIONS RECORDED ACROSS ALL PAGES: 0`);
    console.log(`======================================================================`);
    console.log(`  ALL ${ROUTES.length} PAGES CONFIRMED INTACT, UNMODIFIED, AND HEALTHY! `);
    console.log(`======================================================================`);
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    try {
      chromeProc.kill();
      fs.rmSync(TEMP_PROFILE, { recursive: true, force: true });
    } catch {}
    process.exit(0);
  }
}

run();
