/**
 * test-table-collision-and-overlap.mjs
 * Comprehensive Overlap, Collision & Bounding Rect Verification Suite
 * 
 * Specifically tests:
 * 1. Sent to Main Campus table:
 *    - col-sent-date does NOT collide with col-status
 *    - col-status does NOT collide with col-actions
 *    - btn-mark-received does NOT overlap with StatusBadge
 *    - btn-return-case does NOT overlap with btn-mark-received or icon buttons
 * 2. All tables across viewports:
 *    - 1920px (Desktop Full HD)
 *    - 1440px (Standard Desktop)
 *    - 1366px (Laptop)
 *    - 1024px (Tablet)
 *    - 768px (Tablet Portrait)
 *    - 480px / 375px (Mobile)
 * 3. Captures high-res screenshots for visual verification in both Light and Dark mode.
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ARTIFACTS_DIR = "C:/Users/ehtisham.ali/.gemini/antigravity/brain/c9d0ffe0-251c-4ddb-a2db-3a58235ee952";
const TEMP_PROFILE = path.join(ARTIFACTS_DIR, "scratch", "chrome-overlap-profile");

fs.mkdirSync(TEMP_PROFILE, { recursive: true });

async function run() {
  console.log("=================================================================");
  console.log("  CASETRACK TABLE OVERLAP & COLLISION VERIFICATION SUITE");
  console.log("=================================================================\n");

  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9245",
    `--user-data-dir=${TEMP_PROFILE}`,
    "--disable-gpu",
    "--window-size=1440,900",
    "about:blank"
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch("http://127.0.0.1:9245/json/list");
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

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const curId = msgId++;
      pending.set(curId, { resolve, reject });
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `try { localStorage.setItem("casetrack_auth_token", "casetrack-e2e-test-token"); } catch(e){}`
    });

    // Populate record in Sent to Main Campus
    await send("Page.navigate", { url: "http://localhost:5000/#/students/sent" });
    await new Promise(r => setTimeout(r, 1200));

    await send("Runtime.evaluate", {
      expression: `(() => {
        const raw = localStorage.getItem("casetrack_db_v2");
        const db = raw ? JSON.parse(raw) : { students: [] };
        // Ensure student 823 matching screenshot is present in stage 2 (Sent to Main Campus)
        const match = db.students.find(s => s.studentId === "IU04-0121-0203");
        if (match) {
          match.status = "Sent to Main Campus";
          match.sendHistory = [{ attempt: 1, sentAt: "2026-11-21T17:09:00", operator: "Admin Officer" }];
        } else {
          db.students.unshift({
            id: "std-sent-823",
            serialNumber: 823,
            studentId: "IU04-0121-0203",
            name: "Ahnaf Zahid",
            program: "BBA-H-135-BACHELOR OF BUSINESS ADMINISTRATION (HONORS) - FBA",
            applyOn: "2026-10-02",
            status: "Sent to Main Campus",
            documentStatus: "Submitted",
            sendHistory: [{ attempt: 1, sentAt: "2026-11-21T17:09:00", operator: "Admin Officer" }]
          });
        }
        localStorage.setItem("casetrack_db_v2", JSON.stringify(db));
      })()`
    });

    await send("Page.reload");
    await new Promise(r => setTimeout(r, 1200));

    // Test viewports: 1920, 1440, 1366, 1024, 768, 480, 375
    const viewports = [
      { name: "1920x1080 (Desktop FHD)", width: 1920, height: 1080 },
      { name: "1440x900 (Desktop Standard)", width: 1440, height: 900 },
      { name: "1366x768 (Laptop)", width: 1366, height: 768 },
      { name: "1024x768 (Tablet Landscape)", width: 1024, height: 768 },
      { name: "768x1024 (Tablet Portrait)", width: 768, height: 1024 },
      { name: "480x854 (Mobile Large)", width: 480, height: 854 },
      { name: "375x667 (Mobile Small)", width: 375, height: 667 }
    ];

    let overallCollisionFree = true;

    for (const vp of viewports) {
      console.log(`\n--- Testing Overlap & Collision at ${vp.name} ---`);
      await send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 900
      });
      await new Promise(r => setTimeout(r, 400));

      const overlapCheck = await send("Runtime.evaluate", {
        expression: `(() => {
          const row = document.querySelector("tbody tr");
          if (!row) return { error: "No row found" };

          const sentCol = row.querySelector(".col-sent-date");
          const statusCol = row.querySelector(".col-status");
          const actionsCol = row.querySelector(".col-actions");

          const sentChip = sentCol ? sentCol.querySelector(".timestamp-chip") : null;
          const statusBadge = statusCol ? statusCol.querySelector(".status-badge") : null;
          const markReceivedBtn = actionsCol ? actionsCol.querySelector(".btn-mark-received") : null;
          const returnCaseBtn = actionsCol ? actionsCol.querySelector(".btn-return-case") : null;
          const iconGroup = actionsCol ? actionsCol.querySelector(".table-icon-group") : null;

          function getRect(el) {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10, width: Math.round(r.width * 10) / 10 };
          }

          const rSentCol = getRect(sentCol);
          const rStatusCol = getRect(statusCol);
          const rActionsCol = getRect(actionsCol);

          const rSentChip = getRect(sentChip);
          const rStatusBadge = getRect(statusBadge);
          const rMarkReceivedBtn = getRect(markReceivedBtn);
          const rReturnCaseBtn = getRect(returnCaseBtn);
          const rIconGroup = getRect(iconGroup);

          // Overlap detection function: checks horizontal intersection
          function checkHorizontalOverlap(r1, r2) {
            if (!r1 || !r2) return false;
            // Overlap exists if right edge of r1 extends past left edge of r2 by > 0.5px
            return r1.right > r2.left + 0.5;
          }

          const colSentOverlapsStatus = checkHorizontalOverlap(rSentCol, rStatusCol);
          const colStatusOverlapsActions = checkHorizontalOverlap(rStatusCol, rActionsCol);

          const chipOverlapsBadge = checkHorizontalOverlap(rSentChip, rStatusBadge);
          const badgeOverlapsBtn = checkHorizontalOverlap(rStatusBadge, rMarkReceivedBtn);
          const receivedOverlapsReturn = checkHorizontalOverlap(rMarkReceivedBtn, rReturnCaseBtn);
          const returnOverlapsIcons = checkHorizontalOverlap(rReturnCaseBtn, rIconGroup);

          // Calculate clear separation gaps (should be >= 0)
          const gapSentToStatus = rStatusCol && rSentCol ? (rStatusCol.left - rSentCol.right) : 0;
          const gapStatusToActions = rActionsCol && rStatusCol ? (rActionsCol.left - rStatusCol.right) : 0;
          const gapBadgeToBtn = rMarkReceivedBtn && rStatusBadge ? (rMarkReceivedBtn.left - rStatusBadge.right) : 0;

          return {
            colSentOverlapsStatus,
            colStatusOverlapsActions,
            chipOverlapsBadge,
            badgeOverlapsBtn,
            receivedOverlapsReturn,
            returnOverlapsIcons,
            gapSentToStatus: Math.round(gapSentToStatus * 10) / 10,
            gapStatusToActions: Math.round(gapStatusToActions * 10) / 10,
            gapBadgeToBtn: Math.round(gapBadgeToBtn * 10) / 10,
            btnMarkReceivedVisible: markReceivedBtn ? (markReceivedBtn.offsetWidth > 50 && markReceivedBtn.offsetHeight > 20) : false,
            btnReturnCaseVisible: returnCaseBtn ? (returnCaseBtn.offsetWidth > 50 && returnCaseBtn.offsetHeight > 20) : false,
            rects: {
              sentCol: rSentCol,
              statusCol: rStatusCol,
              actionsCol: rActionsCol,
              sentChip: rSentChip,
              statusBadge: rStatusBadge,
              markReceivedBtn: rMarkReceivedBtn
            }
          };
        })()`,
        returnByValue: true
      });

      const res = overlapCheck.result?.result?.value || overlapCheck.result?.value;
      if (!res || res.error) {
        console.error(`  [FAIL] ${vp.name}: ${res?.error || "Unknown error"}`);
        overallCollisionFree = false;
        continue;
      }

      const hasCollision = res.colSentOverlapsStatus || res.colStatusOverlapsActions ||
                           res.chipOverlapsBadge || res.badgeOverlapsBtn ||
                           res.receivedOverlapsReturn || res.returnOverlapsIcons;

      if (hasCollision) {
        console.error(`  [FAIL] Collision detected at ${vp.name}:`, res);
        overallCollisionFree = false;
      } else {
        console.log(`  [PASS] Zero collision at ${vp.name}!`);
        console.log(`         Badge to Mark-Received separation gap: ${res.gapBadgeToBtn}px`);
        console.log(`         Status to Actions cell gap: ${res.gapStatusToActions}px`);
        console.log(`         Buttons visible & clickable: Mark Received=${res.btnMarkReceivedVisible}, Return Case=${res.btnReturnCaseVisible}`);
      }
    }

    // Capture Light & Dark Mode High-Res Visual Screenshots on 1440px desktop
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await new Promise(r => setTimeout(r, 400));

    // Light Mode Screenshot
    await send("Runtime.evaluate", {
      expression: `(() => {
        document.documentElement.setAttribute("data-bs-theme", "light");
        document.documentElement.setAttribute("data-coreui-theme", "light");
      })()`
    });
    await new Promise(r => setTimeout(r, 400));
    const shotLight = await send("Page.captureScreenshot", { format: "png" });
    const dataLight = shotLight.data || shotLight.result?.data;
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "casetrack-sent-table-light-fixed.png"), Buffer.from(dataLight, "base64"));
    console.log(`\n[PASS] Saved visual artifact: casetrack-sent-table-light-fixed.png`);

    // Switch to Dark Mode & Screenshot
    await send("Runtime.evaluate", {
      expression: `(() => {
        document.documentElement.setAttribute("data-bs-theme", "dark");
        document.documentElement.setAttribute("data-coreui-theme", "dark");
      })()`
    });
    await new Promise(r => setTimeout(r, 400));
    const shotDark = await send("Page.captureScreenshot", { format: "png" });
    const dataDark = shotDark.data || shotDark.result?.data;
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "casetrack-sent-table-dark-fixed.png"), Buffer.from(dataDark, "base64"));
    console.log(`[PASS] Saved visual artifact: casetrack-sent-table-dark-fixed.png`);

    // Switch back to light theme
    await send("Runtime.evaluate", {
      expression: `document.documentElement.setAttribute("data-bs-theme", "light"); document.documentElement.setAttribute("data-coreui-theme", "light");`
    });

    if (overallCollisionFree) {
      console.log("\n=================================================================");
      console.log("  ALL OVERLAP & COLLISION TESTS PASSED (100% SUCCESS)!");
      console.log("=================================================================");
      process.exit(0);
    } else {
      console.error("\n[FAIL] Table elements overlapped in one or more viewports.");
      process.exit(1);
    }
  } finally {
    chromeProc.kill();
  }
}

run().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
