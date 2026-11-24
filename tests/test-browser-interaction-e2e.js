import { spawn, fork } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TEMP_PROFILE = path.join(os.tmpdir(), "casetrack_cdp_e2e_" + Date.now());

async function run() {
  console.log("======================================================================");
  console.log("  CASETRACK REAL BROWSER E2E INTERACTION & PERSISTENCE TEST SUITE    ");
  console.log("======================================================================\n");

  const SERVER_PORT = 5000;
  process.env.PORT = String(SERVER_PORT);

  // 1. Start Server
  const serverProc = fork("server.js", {
    env: { ...process.env, PORT: String(SERVER_PORT) },
    stdio: "pipe"
  });

  serverProc.stderr.on("data", d => console.error(`[server err]: ${d}`));

  await new Promise(r => setTimeout(r, 2000));

  // 2. Start Chrome
  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9227",
    `--user-data-dir=${TEMP_PROFILE}`,
    "--disable-gpu",
    "--window-size=1440,900",
    "about:blank"
  ], { stdio: "pipe" });

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch("http://127.0.0.1:9227/json/list");
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
        else resolve(data.result);
      }

      if (data.method === "Runtime.exceptionThrown") {
        const exc = data.params.exceptionDetails;
        const msg = exc.exception ? exc.exception.description || exc.exception.value : exc.text;
        jsErrors.push(msg);
        console.error(`[Browser JS Error]: ${msg}`);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send("Runtime.enable");
    await send("Page.enable");

    // TEST 1: Initial Load
    console.log("TEST 1: Navigating to Dashboard (http://localhost:5000/#/dashboard)...");
    await send("Page.navigate", { url: "http://localhost:5000/#/dashboard" });
    await new Promise(r => setTimeout(r, 2500));

    const dashTitle = await send("Runtime.evaluate", {
      expression: "document.title",
      returnByValue: true
    });
    console.log("  [PASS] Page Title:", dashTitle.result?.value);
    assert.ok(dashTitle.result?.value.includes("CaseTrack"));

    // If on login screen, authenticate with Super Admin credentials
    await send("Runtime.evaluate", {
      expression: `
        (async () => {
          if (window.location.hash.includes("/login")) {
            const adminBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Super Admin'));
            if (adminBtn) adminBtn.click();
            await new Promise(r => setTimeout(r, 300));
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.click();
          }
        })()
      `,
      awaitPromise: true
    });
    await new Promise(r => setTimeout(r, 1500));

    // TEST 2: Add Student Modal
    console.log("\nTEST 2: Triggering 'Add Student' Modal...");
    const openModalRes = await send("Runtime.evaluate", {
      expression: `
        (() => {
          // Find Add Student button in header or action bar
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add Student'));
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        })()
      `,
      returnByValue: true
    });
    console.log("  Clicked Add Student button:", openModalRes.result?.value);
    await new Promise(r => setTimeout(r, 600));

    const modalState = await send("Runtime.evaluate", {
      expression: "!!document.querySelector('.modal.show')",
      returnByValue: true
    });
    assert.strictEqual(modalState.result?.value, true, "Modal should be open");
    console.log("  [PASS] Add Student Modal is open and visible.");

    // TEST 3: Fill and Submit Student Form
    console.log("\nTEST 3: Filling and submitting student creation form...");
    const submitRes = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const modal = document.querySelector('.modal.show');
          if (!modal) return { submitted: false, error: "modal not found" };

          const inputs = Array.from(modal.querySelectorAll('input:not([type="hidden"])'));
          const idInput = inputs.find(i => i.placeholder?.includes('IU') || i.type === 'text') || inputs[0];
          const nameInput = inputs.find(i => i.placeholder?.includes('Ahmed') || i.placeholder?.includes('Name')) || inputs[1];
          const progInput = inputs.find(i => i.placeholder?.includes('BSCS') || i.placeholder?.includes('Program')) || inputs[2];
          const dateInput = inputs.find(i => i.type === 'date') || inputs[3];

          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;

          if (idInput && nameInput && progInput) {
            nativeSetter.call(idInput, "IU04-2026-9999");
            idInput.dispatchEvent(new Event('input', { bubbles: true }));
            idInput.dispatchEvent(new Event('change', { bubbles: true }));

            nativeSetter.call(nameInput, "Zainab Malik");
            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
            nameInput.dispatchEvent(new Event('change', { bubbles: true }));

            nativeSetter.call(progInput, "BSCS");
            progInput.dispatchEvent(new Event('input', { bubbles: true }));
            progInput.dispatchEvent(new Event('change', { bubbles: true }));

            if (dateInput) {
              nativeSetter.call(dateInput, "2026-11-20");
              dateInput.dispatchEvent(new Event('input', { bubbles: true }));
              dateInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Click submit button
            const saveBtn = Array.from(modal.querySelectorAll('button')).find(b => 
              b.innerText.includes('Save') || b.innerText.includes('Add') || b.type === 'submit'
            );
            if (saveBtn) {
              saveBtn.click();
              return { submitted: true, studentId: "IU04-2026-9999" };
            }
          }
          return { submitted: false, inputsCount: inputs.length };
        })()
      `,
      returnByValue: true
    });
    console.log("  Form submit action:", submitRes.result?.value);
    await new Promise(r => setTimeout(r, 1200));

    // TEST 4: Verify Student in All Students Table
    console.log("\nTEST 4: Navigating to All Students and verifying newly created record...");
    await send("Runtime.evaluate", { expression: "window.location.hash = '#/students/all';" });
    await new Promise(r => setTimeout(r, 1200));

    // Filter by student ID in search input so record appears regardless of pagination
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const searchInput = document.querySelector('input[placeholder*="Search"]');
          if (searchInput) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeSetter.call(searchInput, "IU04-2026-9999");
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        })()
      `
    });
    await new Promise(r => setTimeout(r, 600));

    const checkStudentInTable = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const text = document.body.innerText;
          const hasId = text.includes("IU04-2026-9999");
          const hasName = text.includes("Zainab Malik");
          const rowCount = document.querySelectorAll('tbody tr').length;
          return { hasId, hasName, rowCount };
        })()
      `,
      returnByValue: true
    });
    console.log("  Table check:", checkStudentInTable.result?.value);
    assert.ok(checkStudentInTable.result?.value.hasId, "Created student ID should appear in table");
    assert.ok(checkStudentInTable.result?.value.hasName, "Created student Name should appear in table");
    console.log("  [PASS] Student IU04-2026-9999 confirmed rendered in table.");

    // TEST 5: Verify Persistence across Page Reload
    console.log("\nTEST 5: Testing LocalStorage persistence after Page Reload...");
    await send("Page.reload", { ignoreCache: true });
    await new Promise(r => setTimeout(r, 2000));

    // If redirected to login, re-authenticate
    await send("Runtime.evaluate", {
      expression: `
        (async () => {
          if (window.location.hash.includes("/login")) {
            const adminBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Super Admin'));
            if (adminBtn) adminBtn.click();
            await new Promise(r => setTimeout(r, 300));
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.click();
          }
        })()
      `,
      awaitPromise: true
    });
    await new Promise(r => setTimeout(r, 1500));

    await send("Runtime.evaluate", { expression: "window.location.hash = '#/students/all';" });
    await new Promise(r => setTimeout(r, 1000));

    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const searchInput = document.querySelector('input[placeholder*="Search"]');
          if (searchInput) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeSetter.call(searchInput, "IU04-2026-9999");
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        })()
      `
    });
    await new Promise(r => setTimeout(r, 600));

    const checkPersisted = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const text = document.body.innerText;
          return {
            hasId: text.includes("IU04-2026-9999"),
            hasName: text.includes("Zainab Malik"),
            localStorageDb: !!localStorage.getItem("casetrack_db_v2")
          };
        })()
      `,
      returnByValue: true
    });
    console.log("  Persistence check:", checkPersisted.result?.value);
    assert.ok(checkPersisted.result?.value.hasId, "Student ID must persist after page reload");
    assert.ok(checkPersisted.result?.value.localStorageDb, "LocalStorage database must be present");
    console.log("  [PASS] Record IU04-2026-9999 persisted successfully after full reload.");

    // TEST 6: Verify Data Management & Clean Data from Database section
    console.log("\nTEST 6: Navigating to Data Management & Persistence...");
    await send("Runtime.evaluate", { expression: "window.location.hash = '#/data-management';" });
    await new Promise(r => setTimeout(r, 1200));

    const dataMgmtCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const h5s = Array.from(document.querySelectorAll('h5')).map(h => h.innerText);
          const hasCleanSection = h5s.some(t => t.includes("Clean Data from Database"));
          const previewTiles = document.querySelectorAll('.card-body .fs-5.fw-bold').length;
          const candidateRows = document.querySelectorAll('tbody tr').length;
          return { hasCleanSection, previewTiles, candidateRows };
        })()
      `,
      returnByValue: true
    });
    console.log("  Data Management check:", dataMgmtCheck.result?.value);
    assert.ok(dataMgmtCheck.result?.value.hasCleanSection, "Clean Data from Database section must be rendered");
    assert.ok(dataMgmtCheck.result?.value.previewTiles >= 8, "Database preview metric tiles must be rendered");
    console.log("  [PASS] Clean Data from Database section and preview tiles rendered properly.");

    // TEST 7: Responsive Viewport Checks
    console.log("\nTEST 7: Checking Responsive Layouts across 5 viewports...");
    const viewports = [
      { name: "Large Desktop", w: 1920, h: 1080 },
      { name: "Laptop", w: 1200, h: 800 },
      { name: "Tablet Landscape", w: 1024, h: 768 },
      { name: "Tablet Portrait", w: 768, h: 1024 },
      { name: "Mobile", w: 375, h: 812 }
    ];

    for (const vp of viewports) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: vp.w,
        height: vp.h,
        deviceScaleFactor: 1,
        mobile: vp.w < 768
      });
      await new Promise(r => setTimeout(r, 500));

      const overflowCheck = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const bodyW = document.body.scrollWidth;
            const winW = window.innerWidth;
            return {
              scrollWidth: bodyW,
              innerWidth: winW,
              hasHorizontalScroll: bodyW > winW
            };
          })()
        `,
        returnByValue: true
      });
      console.log(`  Viewport ${vp.name} (${vp.w}x${vp.h}): hasHorizontalScroll=${overflowCheck.result?.value?.hasHorizontalScroll}`);
      assert.strictEqual(overflowCheck.result?.value?.hasHorizontalScroll, false, `Viewport ${vp.name} must not overflow`);
    }
    console.log("  [PASS] All 5 viewports verified: Zero horizontal scrolling detected.");

    console.log("\n======================================================================");
    console.log(`  TOTAL BROWSER EXCEPTIONS RECORDED: ${jsErrors.length}`);
    console.log("  ALL REAL BROWSER E2E TESTS PASSED WITH 100% SUCCESS!");
    console.log("======================================================================\n");

    ws.close();
  } catch (err) {
    console.error("Browser E2E test failed:", err);
    process.exit(1);
  } finally {
    chromeProc.kill();
    serverProc.kill();
  }
}

run();
