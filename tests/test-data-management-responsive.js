import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TEMP_PROFILE = path.join(os.tmpdir(), "casetrack_dm_resp_" + Date.now());

const VIEWPORTS = [
  { name: "Desktop Large", w: 1920, h: 1080 },
  { name: "Desktop Standard", w: 1440, h: 900 },
  { name: "Desktop Small / Laptop", w: 1366, h: 768 },
  { name: "Laptop Compact", w: 1280, h: 800 },
  { name: "Laptop / Tablet Landscape", w: 1024, h: 768 },
  { name: "Tablet Portrait", w: 768, h: 1024 },
  { name: "Mobile Large (iPhone 14 Pro Max)", w: 430, h: 932 },
  { name: "Mobile Standard (iPhone 12/13/14)", w: 390, h: 844 },
  { name: "Mobile Compact (Galaxy S8)", w: 360, h: 740 }
];

async function run() {
  console.log("======================================================================");
  console.log("  CASETRACK DATA MANAGEMENT COMPREHENSIVE RESPONSIVE TEST SUITE       ");
  console.log("======================================================================\n");

  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9229",
    `--user-data-dir=${TEMP_PROFILE}`,
    "--disable-gpu",
    "--window-size=1440,900",
    "about:blank"
  ], { stdio: "pipe" });

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch("http://127.0.0.1:9229/json/list");
    const targets = await listRes.json();
    const pageTarget = targets.find(t => t.type === "page") || targets[0];

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
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
        const id = msgId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `try { localStorage.setItem("casetrack_auth_token", "casetrack-e2e-test-token"); } catch(e){}`
    });

    // Navigate to Data Management
    console.log("Navigating to Data Management: http://localhost:5000/#/data-management");
    await send("Page.navigate", { url: "http://localhost:5000/#/data-management" });
    await new Promise(r => setTimeout(r, 3000));

    const debugInfo = await send("Runtime.evaluate", {
      expression: `({ url: window.location.href, title: document.title, token: localStorage.getItem("casetrack_auth_token"), bodySnippet: document.body.innerText.substring(0, 200) })`,
      returnByValue: true
    });
    console.log("Debug info:", JSON.stringify(debugInfo));

    // Wait until document.readyState === "complete"
    for (let i = 0; i < 20; i++) {
      const readyRes = await send("Runtime.evaluate", { expression: "document.readyState === 'complete' && !!document.querySelector('.data-mgmt-page')" });
      if (readyRes.result?.value) break;
      await new Promise(r => setTimeout(r, 250));
    }

    // Test each viewport
    for (const vp of VIEWPORTS) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: vp.w,
        height: vp.h,
        deviceScaleFactor: 1,
        mobile: vp.w < 768
      });
      await new Promise(r => setTimeout(r, 400));

      const evalRes = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const hasHorizontalScroll = document.documentElement.scrollWidth > window.innerWidth;
            const scrollWidth = document.documentElement.scrollWidth;
            const innerWidth = window.innerWidth;
            
            // Check sections presence
            const hasSectionA = !!document.getElementById("section-excel-import");
            const hasSectionB = !!document.getElementById("section-excel-export");
            const hasSectionC = !!document.getElementById("section-json-backup");
            const hasSectionD = !!document.getElementById("section-database-management");
            
            // Check card bounding widths
            const cards = Array.from(document.querySelectorAll('.dm-card'));
            const cardOverlaps = cards.some(c => c.getBoundingClientRect().right > window.innerWidth + 2);

            return {
              hasHorizontalScroll,
              scrollWidth,
              innerWidth,
              hasSectionA,
              hasSectionB,
              hasSectionC,
              hasSectionD,
              cardOverlaps,
              cardsCount: cards.length
            };
          })()
        `,
        returnByValue: true
      });

      const metrics = evalRes.result?.result?.value || evalRes.result?.value;
      assert.ok(metrics, `Metrics must return for viewport ${vp.name}`);
      assert.equal(metrics.hasHorizontalScroll, false, `Viewport ${vp.name} (${vp.w}x${vp.h}) must not have horizontal scroll`);
      assert.equal(metrics.cardOverlaps, false, `Viewport ${vp.name} cards must fit within viewport`);
      assert.ok(metrics.hasSectionA, `Section A must be present in ${vp.name}`);
      assert.ok(metrics.hasSectionB, `Section B must be present in ${vp.name}`);
      assert.ok(metrics.hasSectionC, `Section C must be present in ${vp.name}`);
      assert.ok(metrics.hasSectionD, `Section D must be present in ${vp.name}`);

      console.log(`  [PASS] Viewport ${vp.name} (${vp.w}x${vp.h}): scrollWidth=${metrics.scrollWidth} <= innerWidth=${metrics.innerWidth}, 0 card overflows, all 4 sections verified.`);
    }

    assert.equal(jsErrors.length, 0, `Recorded ${jsErrors.length} JavaScript runtime exceptions`);
    console.log(`\n  TOTAL BROWSER EXCEPTIONS RECORDED: 0`);
    console.log(`======================================================================`);
    console.log(`  ALL ${VIEWPORTS.length} DATA MANAGEMENT VIEWPORT RESPONSIVE TESTS PASSED (100%)! `);
    console.log(`======================================================================`);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  } finally {
    try {
      chromeProc.kill("SIGKILL");
      fs.rmSync(TEMP_PROFILE, { recursive: true, force: true });
    } catch {}
    process.exit(0);
  }
}

run();
