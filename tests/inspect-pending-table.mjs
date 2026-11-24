import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TEMP_PROFILE = path.join(os.tmpdir(), "casetrack_inspect_" + Date.now());

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9235",
    `--user-data-dir=${TEMP_PROFILE}`,
    "--disable-gpu",
    "--window-size=1440,900",
    "about:blank"
  ], { stdio: "pipe" });

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch("http://127.0.0.1:9235/json/list");
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
        ws.send(JSON.stringify({ id: cur, method, params }));
      });
    }

    await send("Page.enable");
    await send("Runtime.enable");

    // Populate a sample pending student if none exist
    await send("Page.navigate", { url: "http://localhost:5000/#/students/pending" });
    await new Promise(r => setTimeout(r, 1200));

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
            }
          ];
          localStorage.setItem("casetrack_db_v2", JSON.stringify(db));
          window.location.reload();
        }
      })()`
    });

    await new Promise(r => setTimeout(r, 1500));

    const analysis = await send("Runtime.evaluate", {
      expression: `(() => {
        const table = document.querySelector(".student-records-table");
        const wrapper = document.querySelector(".sticky-table-wrapper");
        const cardBody = document.querySelector(".card-body");
        const card = cardBody ? cardBody.closest(".card") : null;
        
        const ths = Array.from(table.querySelectorAll("thead th")).map(th => ({
          text: th.innerText.trim(),
          width: th.getBoundingClientRect().width,
          offsetWidth: th.offsetWidth
        }));
        
        const firstRowTds = Array.from(table.querySelectorAll("tbody tr:first-child td")).map(td => ({
          text: td.innerText.trim().slice(0, 30),
          width: td.getBoundingClientRect().width,
          offsetWidth: td.offsetWidth
        }));

        const actionsTd = table.querySelector("tbody tr:first-child td:last-child");
        const actionsWidth = actionsTd ? actionsTd.getBoundingClientRect().width : 0;
        const actionsInnerWidth = actionsTd ? actionsTd.scrollWidth : 0;

        return {
          windowWidth: window.innerWidth,
          cardWidth: card ? card.getBoundingClientRect().width : 0,
          wrapperClientWidth: wrapper ? wrapper.clientWidth : 0,
          wrapperScrollWidth: wrapper ? wrapper.scrollWidth : 0,
          tableClientWidth: table ? table.clientWidth : 0,
          tableScrollWidth: table ? table.scrollWidth : 0,
          columns: ths,
          firstRowTds,
          actionsWidth,
          actionsInnerWidth
        };
      })()`,
      returnByValue: true
    });

    console.log("Analysis Result:\n", JSON.stringify(analysis.result?.result?.value || analysis.result?.value, null, 2));

  } finally {
    try { chromeProc.kill(); } catch {}
    try { fs.rmSync(TEMP_PROFILE, { recursive: true, force: true }); } catch {}
    process.exit(0);
  }
}

run();
