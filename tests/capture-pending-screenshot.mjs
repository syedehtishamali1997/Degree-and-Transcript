import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TEMP_PROFILE = path.join(os.tmpdir(), "casetrack_ss_" + Date.now());

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9236",
    `--user-data-dir=${TEMP_PROFILE}`,
    "--disable-gpu",
    "--window-size=1440,900",
    "about:blank"
  ], { stdio: "pipe" });

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch("http://127.0.0.1:9236/json/list");
    const targets = await listRes.json();
    const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
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
        const cur = id++;
        pending.set(cur, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send("Page.enable");
    await send("Runtime.enable");

    // Navigate to Pending Cases
    await send("Page.navigate", { url: "http://localhost:5000/#/students/pending" });
    await new Promise(r => setTimeout(r, 1500));

    // Ensure sample students exist
    await send("Runtime.evaluate", {
      expression: `(() => {
        const raw = localStorage.getItem("casetrack_db_v2");
        const db = raw ? JSON.parse(raw) : { students: [] };
        if (!db.students || db.students.length === 0) {
          db.students = [
            {
              id: "stu-1",
              serialNumber: 1,
              studentId: "IU04-0322-0490",
              name: "Syeda Yusra Erum",
              program: "AD(DM)-66-ASSOCIATE DEGREE IN DIGITAL MARKETING - FBA",
              applyOn: "2025-11-12",
              status: "pending",
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
              status: "pending",
              documentStatus: "Not Uploaded",
              sendHistory: []
            },
            {
              id: "stu-3",
              serialNumber: 3,
              studentId: "IU04-0221-0125",
              name: "Muhammad Shahwaiz Sohail",
              program: "BS(CS)-136-BACHELOR OF SCIENCE (COMPUTER SCIENCE) - FEST",
              applyOn: "2025-11-18",
              status: "pending",
              documentStatus: "Not Uploaded",
              sendHistory: []
            }
          ];
          localStorage.setItem("casetrack_db_v2", JSON.stringify(db));
          window.location.reload();
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 1500));

    // Screenshot 1: Desktop 1440x900 Light Theme
    const ss1 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync("responsive-screenshots/pending-table-current-desktop.png", Buffer.from(ss1.result.data, "base64"));
    console.log("Captured responsive-screenshots/pending-table-current-desktop.png");

  } finally {
    try { chromeProc.kill(); } catch {}
    try { fs.rmSync(TEMP_PROFILE, { recursive: true, force: true }); } catch {}
    process.exit(0);
  }
}

run();
