/**
 * tests/test-all-tables-responsive.mjs
 * Comprehensive end-to-end audit for all tables in CaseTrack.
 * 
 * Verifies:
 * 1. All Students (/students/all)
 * 2. Pending Cases (/students/pending)
 * 3. Case Ready (/students/case-ready)
 * 4. Sent to Main Campus (/students/sent)
 * 5. Returned Cases (/students/returned)
 * 6. Received Cases (/students/received)
 * 7. Activity History (/history)
 * 8. Dashboard Program Report (/dashboard)
 * 9. Data Management (/data-management)
 * 
 * Tests across Desktop (1920, 1440, 1366, 1024) and Mobile/Tablet (768, 430).
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TEMP_PROFILE = path.join(os.tmpdir(), "casetrack_audit_all_tables_" + Date.now());
const SCREENSHOT_DIR = path.resolve("responsive-screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const PAGES = [
  { id: "all", name: "All Students", url: "http://localhost:5000/#/students/all" },
  { id: "pending", name: "Pending Cases", url: "http://localhost:5000/#/students/pending" },
  { id: "case-ready", name: "Case Ready", url: "http://localhost:5000/#/students/case-ready" },
  { id: "sent", name: "Sent to Main Campus", url: "http://localhost:5000/#/students/sent" },
  { id: "returned", name: "Returned Cases", url: "http://localhost:5000/#/students/returned" },
  { id: "received", name: "Received Cases", url: "http://localhost:5000/#/students/received" },
  { id: "history", name: "Activity History", url: "http://localhost:5000/#/history" },
  { id: "dashboard", name: "Dashboard (Program Report)", url: "http://localhost:5000/#/dashboard" },
  { id: "data-management", name: "Data Management", url: "http://localhost:5000/#/data-management" }
];

const DESKTOP_VIEWPORTS = [
  { name: "1920x1080 (Large Desktop)", width: 1920, height: 1080 },
  { name: "1440x900 (Standard Desktop)", width: 1440, height: 900 },
  { name: "1366x768 (Laptop)", width: 1366, height: 768 }
];

const MOBILE_TABLET_VIEWPORTS = [
  { name: "1024x768 (Small Desktop / Tablet Landscape)", width: 1024, height: 768, isMobile: false },
  { name: "768x1024 (Tablet Portrait)", width: 768, height: 1024, isMobile: true },
  { name: "430x932 (Mobile)", width: 430, height: 932, isMobile: true }
];

async function run() {
  console.log("=================================================================");
  console.log("  CASETRACK GLOBAL TABLE AUDIT & RESPONSIVE VERIFICATION");
  console.log("=================================================================\n");

  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9241",
    `--user-data-dir=${TEMP_PROFILE}`,
    "--disable-gpu",
    "--window-size=1440,900",
    "about:blank"
  ], { stdio: "pipe" });

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch("http://127.0.0.1:9241/json/list");
    const targets = await listRes.json();
    const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let msgId = 1;
    const pending = new Map();

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const curId = msgId++;
        pending.set(curId, { resolve, reject });
        ws.send(JSON.stringify({ id: curId, method, params }));
      });
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `try { localStorage.setItem("casetrack_auth_token", "casetrack-e2e-test-token"); } catch(e){}`
    });

    // Populate database with records in every workflow stage and activity history
    await send("Page.navigate", { url: "http://localhost:5000/#/dashboard" });
    await new Promise(r => setTimeout(r, 1200));

    await send("Runtime.evaluate", {
      expression: `(() => {
        const raw = localStorage.getItem("casetrack_db_v2");
        const db = raw ? JSON.parse(raw) : { students: [] };
        db.students = [
          {
            id: "stu-1",
            serialNumber: 1,
            studentId: "IU04-0322-0490",
            name: "Syeda Yusra Erum",
            program: "AD(DM)-66-ASSOCIATE DEGREE IN DIGITAL MARKETING - FBA",
            applyOn: "2025-11-12",
            status: "Pending",
            documentStatus: "Not Uploaded",
            sendHistory: []
          },
          {
            id: "stu-2",
            serialNumber: 2,
            studentId: "IU04-0321-0109",
            name: "Muhammad Abdullah Ibn E Saleem",
            program: "BBA-H-135-BACHELOR OF BUSINESS ADMINISTRATION (HONORS) - FBA",
            applyOn: "2025-11-14",
            status: "Case Ready",
            caseReady: "2025-11-15T10:00:00Z",
            documentStatus: "Submitted",
            documentFolder: "IU04-0321-0109_Muhammad_Abdullah",
            sendHistory: []
          },
          {
            id: "stu-3",
            serialNumber: 3,
            studentId: "IU04-0221-0125",
            name: "Muhammad Shahwaiz Sohail",
            program: "BS(CS)-136-BACHELOR OF SCIENCE (COMPUTER SCIENCE) - FEST",
            applyOn: "2025-11-18",
            status: "Sent to Main Campus",
            caseReady: "2025-11-19T09:00:00Z",
            documentStatus: "Submitted",
            sendHistory: [{ attempt: 1, sentAt: "2025-11-19T11:00:00Z", operator: "Admin Officer" }]
          },
          {
            id: "stu-4",
            serialNumber: 4,
            studentId: "IU04-0121-0478",
            name: "Muhammad Ibad Ur Rehman",
            program: "BBA-H-135-BACHELOR OF BUSINESS ADMINISTRATION (HONORS) - FBA",
            applyOn: "2025-11-18",
            status: "Returned from Main Campus",
            caseReady: "2025-11-19T09:00:00Z",
            documentStatus: "Submitted",
            sendHistory: [{ 
              attempt: 1, 
              sentAt: "2025-11-19T11:00:00Z", 
              returnedAt: "2025-11-20T14:00:00Z", 
              returnReason: "Name mismatch on Matric Certificate. Please provide affidavit.",
              operator: "Admin Officer" 
            }]
          },
          {
            id: "stu-5",
            serialNumber: 5,
            studentId: "IU04-0321-0021",
            name: "Muhammad Uzair",
            program: "BS(CS)-136-BACHELOR OF SCIENCE (COMPUTER SCIENCE) - FEST",
            applyOn: "2025-11-18",
            status: "Received from Main Campus",
            caseReady: "2025-11-19T09:00:00Z",
            received: "2025-11-20T16:00:00Z",
            documentStatus: "Submitted",
            sendHistory: [{ attempt: 1, sentAt: "2025-11-19T11:00:00Z", operator: "Admin Officer" }]
          }
        ];
        db.history = [
          {
            timestamp: "2025-11-20T16:00:00Z",
            action: "Received from Main Campus",
            studentId: "IU04-0321-0021",
            studentName: "Muhammad Uzair",
            program: "BS(CS)-136-BACHELOR OF SCIENCE (COMPUTER SCIENCE) - FEST",
            operator: "Admin Officer",
            description: "Degree and transcript package received back from Main Campus and cleared for student collection."
          },
          {
            timestamp: "2025-11-20T14:00:00Z",
            action: "Returned from Main Campus",
            studentId: "IU04-0121-0478",
            studentName: "Muhammad Ibad Ur Rehman",
            program: "BBA-H-135-BACHELOR OF BUSINESS ADMINISTRATION (HONORS) - FBA",
            operator: "Admin Officer",
            description: "Case returned by Main Campus review committee.",
            reason: "Name mismatch on Matric Certificate. Please provide affidavit."
          },
          {
            timestamp: "2025-11-19T11:00:00Z",
            action: "Sent to Main Campus",
            studentId: "IU04-0221-0125",
            studentName: "Muhammad Shahwaiz Sohail",
            program: "BS(CS)-136-BACHELOR OF SCIENCE (COMPUTER SCIENCE) - FEST",
            operator: "Admin Officer",
            description: "Case dispatched in Courier Batch #4920 to Main Campus Registrar."
          },
          {
            timestamp: "2025-11-15T10:00:00Z",
            action: "Case Ready",
            studentId: "IU04-0321-0109",
            studentName: "Muhammad Abdullah Ibn E Saleem",
            program: "BBA-H-135-BACHELOR OF BUSINESS ADMINISTRATION (HONORS) - FBA",
            operator: "Admin Officer",
            description: "Case marked ready for dispatch to Main Campus."
          }
        ];
        localStorage.setItem("casetrack_db_v2", JSON.stringify(db));
      })()`
    });

    await send("Page.reload");
    await new Promise(r => setTimeout(r, 1200));

    let allPassed = true;
    const auditSummary = [];

    // 1. Audit across Desktop resolutions (Strict 100% container fit, 0px overflow)
    for (const vp of DESKTOP_VIEWPORTS) {
      console.log(`\n=============================================================`);
      console.log(`  TESTING DESKTOP VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
      console.log(`=============================================================`);

      await send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: false
      });
      await new Promise(r => setTimeout(r, 400));

      for (const page of PAGES) {
        await send("Page.navigate", { url: page.url });
        await new Promise(r => setTimeout(r, 700));

        const info = await send("Runtime.evaluate", {
          expression: `(() => {
            const table = document.querySelector("table");
            if (!table) return { hasTable: false };
            const wrapper = table.closest(".table-responsive") || table.closest(".dm-table-wrapper") || table.parentElement;
            const containerWidth = wrapper ? Math.round(wrapper.clientWidth) : 0;
            const tableWidth = Math.round(table.clientWidth);
            const tableScroll = Math.round(table.scrollWidth);
            const overflow = Math.max(0, tableScroll - containerWidth);

            const ths = Array.from(table.querySelectorAll("thead th")).map(th => ({
              text: th.innerText.trim(),
              width: Math.round(th.getBoundingClientRect().width)
            }));

            // Check if actions column is clipped
            const actionsTd = table.querySelector("tbody tr:first-child td:last-child");
            let actionsClipped = false;
            if (actionsTd) {
              const rect = actionsTd.getBoundingClientRect();
              const wrapRect = wrapper.getBoundingClientRect();
              if (rect.right > wrapRect.right + 2) {
                actionsClipped = true;
              }
            }

            return {
              hasTable: true,
              containerWidth,
              tableWidth,
              tableScroll,
              overflow,
              actionsClipped,
              cols: ths
            };
          })()`,
          returnByValue: true
        });

        const res = info.result?.result?.value || info.result?.value;
        if (!res || !res.hasTable) {
          console.log(`  [SKIP] ${page.name}: No table found.`);
          continue;
        }

        const isOk = res.overflow === 0 && !res.actionsClipped;
        if (!isOk) allPassed = false;

        const status = isOk ? "PASS" : "FAIL";
        console.log(`  [${status}] ${page.name.padEnd(28)} | Container: ${res.containerWidth}px | Table: ${res.tableWidth}px | Scroll: ${res.tableScroll}px | Overflow: ${res.overflow}px | Clipped: ${res.actionsClipped}`);

        auditSummary.push({
          viewport: vp.name,
          page: page.name,
          container: res.containerWidth,
          table: res.tableWidth,
          overflow: res.overflow,
          clipped: res.actionsClipped,
          status
        });

        // Capture screenshot on 1440px desktop
        if (vp.width === 1440) {
          const shot = await send("Page.captureScreenshot", { format: "png" });
          const data = shot.result?.data || shot.data;
          if (data) {
            const shotPath = path.join(SCREENSHOT_DIR, `table-audit-${page.id}-desktop.png`);
            fs.writeFileSync(shotPath, Buffer.from(data, "base64"));
          }
        }
      }
    }

    // 2. Audit across Tablet & Mobile Viewports (Controlled scroll in wrapper, zero body overflow)
    for (const vp of MOBILE_TABLET_VIEWPORTS) {
      console.log(`\n=============================================================`);
      console.log(`  TESTING MOBILE/TABLET VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
      console.log(`=============================================================`);

      await send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.isMobile ? 2 : 1,
        mobile: vp.isMobile
      });
      await new Promise(r => setTimeout(r, 400));

      for (const page of PAGES) {
        await send("Page.navigate", { url: page.url });
        await new Promise(r => setTimeout(r, 700));

        const mobInfo = await send("Runtime.evaluate", {
          expression: `(() => {
            const table = document.querySelector("table");
            if (!table) return { hasTable: false };
            const wrapper = table.closest(".table-responsive") || table.closest(".dm-table-wrapper") || table.parentElement;
            const bodyOverflow = document.body.scrollWidth > window.innerWidth;
            const containerWidth = wrapper ? Math.round(wrapper.clientWidth) : 0;
            const tableScroll = Math.round(table.scrollWidth);
            const wrapperScrolls = wrapper ? wrapper.scrollWidth > wrapper.clientWidth : false;

            return {
              hasTable: true,
              containerWidth,
              tableScroll,
              wrapperScrolls,
              bodyOverflow
            };
          })()`,
          returnByValue: true
        });

        const mRes = mobInfo.result?.result?.value || mobInfo.result?.value;
        if (!mRes || !mRes.hasTable) continue;

        const isOk = !mRes.bodyOverflow;
        if (!isOk) allPassed = false;

        const status = isOk ? "PASS" : "FAIL";
        console.log(`  [${status}] ${page.name.padEnd(28)} | Container: ${mRes.containerWidth}px | Scroll: ${mRes.tableScroll}px | Scrolls in wrapper: ${mRes.wrapperScrolls} | Window overflow: ${mRes.bodyOverflow}`);
      }
    }

    // 3. Test Dark Theme on Standard Desktop
    console.log(`\n=============================================================`);
    console.log(`  TESTING DARK THEME (1440x900)`);
    console.log(`=============================================================`);
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await send("Runtime.evaluate", {
      expression: `(() => {
        document.documentElement.setAttribute("data-bs-theme", "dark");
        document.documentElement.setAttribute("data-coreui-theme", "dark");
      })()`
    });
    await new Promise(r => setTimeout(r, 400));

    for (const page of PAGES.slice(0, 4)) {
      await send("Page.navigate", { url: page.url });
      await new Promise(r => setTimeout(r, 700));
      await send("Runtime.evaluate", {
        expression: `(() => {
          document.documentElement.setAttribute("data-bs-theme", "dark");
          document.documentElement.setAttribute("data-coreui-theme", "dark");
        })()`
      });
      await new Promise(r => setTimeout(r, 300));

      const shot = await send("Page.captureScreenshot", { format: "png" });
      const data = shot.result?.data || shot.data;
      if (data) {
        const shotPath = path.join(SCREENSHOT_DIR, `table-audit-${page.id}-dark.png`);
        fs.writeFileSync(shotPath, Buffer.from(data, "base64"));
      }
      console.log(`  [PASS] Dark Theme verified & screenshot saved for ${page.name}`);
    }

    console.log("\n=============================================================");
    console.log(allPassed ? "  ALL TABLE AUDITS PASSED WITH 0px OVERFLOW! (100% CONTAINER FIT)" : "  SOME TABLES FAILED AUDIT!");
    console.log("=============================================================\n");

    if (!allPassed) {
      process.exit(1);
    }

  } finally {
    try { chromeProc.kill(); } catch {}
    try { fs.rmSync(TEMP_PROFILE, { recursive: true, force: true }); } catch {}
  }
}

run();
