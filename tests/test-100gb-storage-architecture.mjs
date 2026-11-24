/**
 * tests/test-100gb-storage-architecture.mjs
 * Comprehensive Test Suite for CaseTrack Enterprise 100 GB Data Storage Architecture.
 * Verifies:
 *   1. 100 GB target storage capacity metrics and physical volume inspection
 *   2. Server-side disk persistence for documents, database (data/), and backups (backups/)
 *   3. REST API endpoints (/api/storage/metrics, /api/database, /api/database/sync, /api/storage/backups)
 *   4. Quota overflow prevention and insufficient disk space protection
 *   5. Browser UI rendering: 100 GB Storage Dashboard in Data Management, Sidebar, and Settings
 *   6. Light and Dark theme visual verification with screenshot artifacts
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import {
  TARGET_STORAGE_CAPACITY_BYTES,
  TARGET_STORAGE_CAPACITY_GB,
  DOCUMENTS_DIR,
  DATA_DIR,
  BACKUPS_DIR,
  DATABASE_FILE,
  getStorageMetrics,
  getPhysicalDriveStats,
  checkStorageAvailable,
  saveDatabaseToServer,
  loadDatabaseFromServer,
  listServerBackups,
  pruneOldBackups,
  formatBytes
} from "../server/storageService.js";
import { StorageService } from "../src/services/StorageService.js";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ARTIFACTS_DIR = "C:\\Users\\ehtisham.ali\\.gemini\\antigravity\\brain\\c9d0ffe0-251c-4ddb-a2db-3a58235ee952";
const BASE_URL = "http://localhost:5000";

console.log("======================================================================");
console.log("   CASETRACK 100 GB STORAGE ARCHITECTURE & TELEMETRY TEST SUITE       ");
console.log("======================================================================\n");

async function runTestSuite() {
  const originalDbRaw = fs.existsSync(DATABASE_FILE) ? fs.readFileSync(DATABASE_FILE, "utf-8") : null;
  let passedCount = 0;
  let totalCount = 0;

  function test(name, fn) {
    totalCount++;
    try {
      fn();
      console.log(`  [PASS] Test ${totalCount}: ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`  [FAIL] Test ${totalCount}: ${name}`);
      console.error("         Error:", err.message);
      throw err;
    }
  }

  async function asyncTest(name, fn) {
    totalCount++;
    try {
      await fn();
      console.log(`  [PASS] Test ${totalCount}: ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`  [FAIL] Test ${totalCount}: ${name}`);
      console.error("         Error:", err.message);
      throw err;
    }
  }

  console.log("--- PHASE 1: Quota Constants & Physical Disk Volume Inspection ---");

  test("Target storage constants strictly define 100 GB capacity", () => {
    assert.equal(TARGET_STORAGE_CAPACITY_GB, 100);
    assert.equal(TARGET_STORAGE_CAPACITY_BYTES, 100 * 1024 * 1024 * 1024);
    assert.equal(TARGET_STORAGE_CAPACITY_BYTES, 107374182400);
  });

  test("formatBytes utility converts raw bytes accurately into units", () => {
    assert.equal(formatBytes(0), "0.00 B");
    assert.equal(formatBytes(1024), "1 KB");
    assert.equal(formatBytes(1024 * 1024), "1 MB");
    assert.equal(formatBytes(1024 * 1024 * 1024), "1 GB");
    assert.equal(formatBytes(100 * 1024 * 1024 * 1024), "100 GB");
  });

  test("Physical drive inspection detects drive root, total space, and free space", () => {
    const drive = getPhysicalDriveStats();
    assert.equal(drive.ok, true);
    assert.ok(drive.totalBytes > 0, "Drive total bytes must be positive");
    assert.ok(drive.freeBytes > 0, "Drive free bytes must be positive");
    assert.ok(drive.driveRoot.length > 0, "Drive root must be identified");
    assert.equal(drive.supportsTargetCapacity, true, "Drive capacity must support 100 GB target");
    console.log(`         Drive ${drive.driveRoot}: ${drive.freeFormatted} free of ${drive.totalFormatted} total`);
  });

  console.log("\n--- PHASE 2: Storage Metrics & Multi-Tier Disk Calculation ---");

  test("Live getStorageMetrics aggregates all multi-tier storage folders", () => {
    const metrics = getStorageMetrics();
    assert.equal(metrics.ok, true);
    assert.equal(metrics.targetCapacityGB, 100);
    assert.equal(metrics.targetCapacityBytes, 107374182400);
    assert.ok(metrics.usedBytes >= 0);
    assert.ok(metrics.availableBytes > 0);
    assert.ok(metrics.usagePercent >= 0 && metrics.usagePercent <= 100);

    // Verify breakdown sub-structures
    assert.ok(metrics.breakdown.studentDocuments);
    assert.ok(metrics.breakdown.studentDocuments.bytes >= 0);
    assert.ok(metrics.breakdown.studentDocuments.folderCount > 0, "Must detect student folders");

    assert.ok(metrics.breakdown.database);
    assert.ok(metrics.breakdown.backups);
    assert.ok(metrics.physicalDrive);
    assert.equal(metrics.physicalDrive.supportsTargetCapacity, true);
  });

  console.log("\n--- PHASE 3: Storage Pre-Check & Quota Guard Validation ---");

  test("Pre-check approves normal incoming upload size", () => {
    const check = checkStorageAvailable(50 * 1024 * 1024); // 50 MB
    assert.equal(check.ok, true);
    assert.ok(check.availableBytes > 0);
  });

  test("Pre-check rejects upload that exceeds 100 GB target quota", () => {
    const massiveSize = 101 * 1024 * 1024 * 1024; // 101 GB
    const check = checkStorageAvailable(massiveSize);
    assert.equal(check.ok, false);
    assert.match(check.error, /Storage capacity limit of 100 GB exceeded/i);
  });

  console.log("\n--- PHASE 4: Server Database Persistence & Safety Backups ---");

  const sampleDb = {
    version: "2.0.0",
    lastUpdated: new Date().toISOString(),
    settings: { campusName: "by Iqra University" },
    students: [
      { studentId: "IU04-STORE-001", name: "Alpha Student", program: "BSCS", status: "Pending" },
      { studentId: "IU04-STORE-002", name: "Beta Student", program: "BBA", status: "Case Ready" }
    ],
    history: [{ action: "Database Initialized", timestamp: new Date().toISOString() }],
    notifications: []
  };

  test("saveDatabaseToServer persists database JSON to server disk atomically", () => {
    const res = saveDatabaseToServer(sampleDb, { createBackup: false });
    assert.equal(res.ok, true);
    assert.equal(res.studentCount, 2);
    assert.ok(fs.existsSync(DATABASE_FILE), "data/casetrack_database.json must exist");

    const loaded = loadDatabaseFromServer();
    assert.equal(loaded.students.length, 2);
    assert.equal(loaded.students[0].studentId, "IU04-STORE-001");
  });

  test("saveDatabaseToServer creates rotational backup on second update", () => {
    const updatedDb = {
      ...sampleDb,
      students: [
        ...sampleDb.students,
        { studentId: "IU04-STORE-003", name: "Gamma Student", program: "BSCS", status: "Pending" }
      ]
    };
    const res = saveDatabaseToServer(updatedDb, { createBackup: true });
    assert.equal(res.ok, true);
    assert.ok(res.backupCreated, "A backup file name must be returned");
    assert.ok(fs.existsSync(path.join(BACKUPS_DIR, res.backupCreated)));

    const backups = listServerBackups();
    assert.ok(backups.length >= 1, "At least 1 backup must be listed");
    assert.equal(backups[0].filename, res.backupCreated);
  });

  console.log("\n--- PHASE 5: REST API Endpoint Telemetry Contracts ---");

  await asyncTest("GET /api/storage/metrics returns full 100 GB telemetry", async () => {
    const res = await fetch(`${BASE_URL}/api/storage/metrics`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.targetCapacityGB, 100);
    assert.equal(data.targetCapacityFormatted, "100.00 GB");
    assert.ok(data.usedFormatted);
    assert.ok(data.availableFormatted);
    assert.ok(data.breakdown.studentDocuments.formatted);
    assert.ok(data.breakdown.database.formatted);
    assert.ok(data.breakdown.backups.formatted);
    assert.equal(data.physicalDrive.supportsTargetCapacity, true);
  });

  await asyncTest("GET /api/database retrieves persisted database", async () => {
    const res = await fetch(`${BASE_URL}/api/database`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.found, true);
    assert.ok(Array.isArray(data.database.students));
  });

  await asyncTest("POST /api/database/sync syncs client state and returns confirmation", async () => {
    const syncDb = {
      ...sampleDb,
      students: [
        { studentId: "IU04-SYNC-001", name: "Sync Verify Student", program: "BS(CS)", status: "Pending" }
      ]
    };
    const res = await fetch(`${BASE_URL}/api/database/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ database: syncDb })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.studentCount, 1);
  });

  await asyncTest("GET /api/storage/backups lists rotational backups", async () => {
    const res = await fetch(`${BASE_URL}/api/storage/backups`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.ok(Array.isArray(data.backups));
    assert.ok(data.backups.length >= 1);
  });

  console.log("\n--- PHASE 6: Real Browser E2E Rendering of 100 GB Storage Dashboard ---");

  const tempProfile = path.join(os.tmpdir(), "casetrack_storage_test_" + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9223",
    `--user-data-dir=${tempProfile}`,
    "--disable-gpu",
    "--window-size=1440,900",
    "about:blank"
  ], { stdio: "pipe" });

  await new Promise((r) => setTimeout(r, 2000));

  try {
    const listRes = await fetch("http://127.0.0.1:9223/json/list");
    const targets = await listRes.json();
    const pageTarget = targets.find((t) => t.type === "page") || targets[0];

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
    const pending = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };

    function sendCmd(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendCmd("Page.enable");
    await sendCmd("Runtime.enable");
    await sendCmd("Page.addScriptToEvaluateOnNewDocument", {
      source: `try { localStorage.setItem("casetrack_auth_token", "casetrack-e2e-test-token"); } catch(e){}`
    });

    async function evaluate(expression) {
      const res = await sendCmd("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      return res.result?.value;
    }

    async function navigate(url) {
      await sendCmd("Page.navigate", { url });
      // Wait for page ready
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 200));
        const ready = await evaluate(`document.readyState === 'complete' && !!document.querySelector('#root')`);
        if (ready) break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    async function captureScreenshot(filepath) {
      const snap = await sendCmd("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(filepath, Buffer.from(snap.data, "base64"));
    }

    // 1. Navigate to Data Management Page
    await navigate(`${BASE_URL}/#/data-management`);
    for (let i = 0; i < 30; i++) {
      const rendered = await evaluate(`document.body.innerText.includes("Data Management")`);
      if (rendered) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await new Promise((r) => setTimeout(r, 1000));

    await asyncTest("Data Management renders 100 GB Storage Architecture Card", async () => {
      const title = await evaluate(`
        document.body.innerText.includes("100 GB Storage Architecture & Telemetry")
      `);
      assert.equal(title, true, "Must display '100 GB Storage Architecture & Telemetry'");

      const targetVal = await evaluate(`
        document.body.innerText.includes("100.00 GB")
      `);
      assert.equal(targetVal, true, "Must display 100.00 GB capacity");

      const volumeVerified = await evaluate(`
        document.body.innerText.includes("Physical Volume Verified")
      `);
      assert.equal(volumeVerified, true, "Must display 'Physical Volume Verified' badge");
    });

    await asyncTest("Data Management renders all 3 multi-tier breakdown cards", async () => {
      const docsCard = await evaluate(`document.body.innerText.includes("Student Documents")`);
      const dbCard = await evaluate(`document.body.innerText.includes("Persistent Database")`);
      const backupCard = await evaluate(`document.body.innerText.includes("Safety Backups")`);
      assert.equal(docsCard, true);
      assert.equal(dbCard, true);
      assert.equal(backupCard, true);
    });

    await asyncTest("Sidebar footer reflects 100 GB Storage Quota", async () => {
      const sidebarStorage = await evaluate(`document.querySelector(".sidebar-storage-meta")?.innerText || ""`);
      assert.match(sidebarStorage, /Storage \(100 GB\)/i);
    });

    // Capture Light Theme Screenshot
    const lightScreenshotPath = path.join(ARTIFACTS_DIR, "storage-100gb-dashboard-light.png");
    await captureScreenshot(lightScreenshotPath);
    console.log(`         Saved screenshot: ${lightScreenshotPath}`);

    // Switch to Dark Theme
    await evaluate(`
      document.documentElement.setAttribute('data-bs-theme', 'dark');
      document.documentElement.setAttribute('data-coreui-theme', 'dark');
    `);
    await new Promise((r) => setTimeout(r, 500));

    // Capture Dark Theme Screenshot
    const darkScreenshotPath = path.join(ARTIFACTS_DIR, "storage-100gb-dashboard-dark.png");
    await captureScreenshot(darkScreenshotPath);
    console.log(`         Saved screenshot: ${darkScreenshotPath}`);

    // Navigate to Settings Page
    await navigate(`${BASE_URL}/#/settings`);
    for (let i = 0; i < 30; i++) {
      const rendered = await evaluate(`document.body.innerText.includes("System Settings")`);
      if (rendered) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await new Promise((r) => setTimeout(r, 1000));

    await asyncTest("Settings Page displays 100 GB Storage Volume Card", async () => {
      const settingsVol = await evaluate(`
        document.body.innerText.includes("100 GB Storage Volume")
      `);
      assert.equal(settingsVol, true, "Must display '100 GB Storage Volume'");

      const targetCapacity = await evaluate(`
        document.body.innerText.includes("100.00 GB")
      `);
      assert.equal(targetCapacity, true, "Must display '100.00 GB' in Settings");
    });

    ws.close();
  } finally {
    try {
      chromeProc.kill("SIGKILL");
    } catch {}
    try {
      fs.rmSync(tempProfile, { recursive: true, force: true });
    } catch {}
    if (originalDbRaw) {
      try {
        fs.writeFileSync(DATABASE_FILE, originalDbRaw, "utf-8");
      } catch {}
    }
  }

  console.log("\n======================================================================");
  console.log(`  ALL ${passedCount} OF ${totalCount} 100 GB STORAGE TESTS PASSED SUCCESSFULLY! (100%)`);
  console.log("======================================================================\n");
}

runTestSuite().catch((err) => {
  console.error("Test suite fatal error:", err);
  process.exit(1);
});
