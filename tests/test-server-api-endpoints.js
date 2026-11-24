import http from "node:http";
import assert from "node:assert";
import { fork } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

console.log("=======================================================");
console.log("  EXPRESS BACKEND REST API ENDPOINT INTEGRATION TEST  ");
console.log("=======================================================");

const TEST_PORT = 5055;
process.env.PORT = String(TEST_PORT);

// Spawn the backend server as a child process
const serverProcess = fork("server.js", {
  env: { ...process.env, PORT: String(TEST_PORT) },
  stdio: "pipe"
});

serverProcess.stdout.on("data", (data) => {
  // console.log(`[server stdout]: ${data}`);
});

serverProcess.stderr.on("data", (data) => {
  console.error(`[server stderr]: ${data}`);
});

// Wait for server to boot
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  await wait(1500);

  try {
    // 1. Health check
    console.log("--- 1. Health Check Endpoint ---");
    const healthRes = await fetch(`http://localhost:${TEST_PORT}/api/health`);
    assert.strictEqual(healthRes.status, 200, "Health endpoint should return 200");
    const healthData = await healthRes.json();
    assert.strictEqual(healthData.status, "ok");
    console.log("  [PASS] /api/health returned status: ok");

    // 2. Init folder
    console.log("\n--- 2. Student Folder Initialization ---");
    const initRes = await fetch(`http://localhost:${TEST_PORT}/api/students/init-folder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: "IU04-TEST-0001",
        name: "Audit Test Student",
        program: "BSCS",
        applyOn: "2026-11-20"
      })
    });
    assert.strictEqual(initRes.status, 200);
    const initData = await initRes.json();
    assert.strictEqual(initData.ok, true);
    assert.ok(initData.folderName.includes("IU04-TEST-0001"));
    console.log("  [PASS] /api/students/init-folder successfully created folder: " + initData.folderName);

    // 3. Query documents metadata for initialized student
    console.log("\n--- 3. Query Student Documents Metadata ---");
    const metaRes = await fetch(`http://localhost:${TEST_PORT}/api/documents/IU04-TEST-0001`);
    assert.strictEqual(metaRes.status, 200);
    const metaData = await metaRes.json();
    assert.strictEqual(metaData.ok, true);
    assert.strictEqual(metaData.found, true);
    console.log("  [PASS] /api/documents/IU04-TEST-0001 returned student metadata cleanly.");

    // 4. Test Final PDF retrieval for an existing student with PDF
    console.log("\n--- 4. Verify Final Consolidated PDF Streaming ---");
    const pdfRes = await fetch(`http://localhost:${TEST_PORT}/api/documents/IU04-0319-0999_Ayesha_Siddiqui/final-pdf`);
    assert.strictEqual(pdfRes.status, 200);
    const contentType = pdfRes.headers.get("content-type");
    assert.ok(contentType.includes("application/pdf"), `Content-Type should be PDF, got ${contentType}`);
    const pdfBytes = await pdfRes.arrayBuffer();
    assert.ok(pdfBytes.byteLength > 1000, "PDF byte length should be > 1000 bytes");
    console.log(`  [PASS] /api/documents/IU04-0319-0999_Ayesha_Siddiqui/final-pdf streamed ${pdfBytes.byteLength} bytes.`);

    // 5. Test Safe Document Deletion Endpoint
    console.log("\n--- 5. Test Safe Student Document Deletion ---");
    const delRes = await fetch(`http://localhost:${TEST_PORT}/api/students/IU04-TEST-0001/documents`, {
      method: "DELETE"
    });
    assert.strictEqual(delRes.status, 200);
    const delData = await delRes.json();
    assert.strictEqual(delData.ok, true);
    assert.strictEqual(delData.deleted, true);
    console.log("  [PASS] DELETE /api/students/IU04-TEST-0001/documents safely removed student folder.");

    console.log("\n=======================================================");
    console.log("  ALL EXPRESS REST API ENDPOINT TESTS PASSED (100%)!   ");
    console.log("=======================================================\n");

    serverProcess.kill();
    process.exit(0);
  } catch (err) {
    console.error("Test failed with error:", err);
    serverProcess.kill();
    process.exit(1);
  }
}

run();
