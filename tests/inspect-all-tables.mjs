import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TEMP_PROFILE = path.join(os.tmpdir(), "casetrack_inspect_tables_" + Date.now());

const STAGES = [
  { name: "All Students", url: "http://localhost:5000/#/students/all" },
  { name: "Pending Cases", url: "http://localhost:5000/#/students/pending" },
  { name: "Case Ready", url: "http://localhost:5000/#/students/case-ready" },
  { name: "Sent to Main Campus", url: "http://localhost:5000/#/students/sent" },
  { name: "Returned Cases", url: "http://localhost:5000/#/students/returned" },
  { name: "Received Cases", url: "http://localhost:5000/#/students/received" },
  { name: "Activity History", url: "http://localhost:5000/#/history" },
  { name: "Dashboard (Program Report)", url: "http://localhost:5000/#/dashboard" }
];

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9240",
    `--user-data-dir=${TEMP_PROFILE}`,
    "--disable-gpu",
    "--window-size=1440,900",
    "about:blank"
  ], { stdio: "pipe" });

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch("http://127.0.0.1:9240/json/list");
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

    // Populate sample student in every stage
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
        localStorage.setItem("casetrack_db_v2", JSON.stringify(db));
      })()`
    });

    await send("Page.reload");
    await new Promise(r => setTimeout(r, 1200));

    for (const stage of STAGES) {
      await send("Page.navigate", { url: stage.url });
      await new Promise(r => setTimeout(r, 800));

      const info = await send("Runtime.evaluate", {
        expression: `(() => {
          const table = document.querySelector("table");
          if (!table) return { hasTable: false };
          const wrapper = table.closest(".table-responsive") || table.parentElement;
          const card = table.closest(".card");

          const ths = Array.from(table.querySelectorAll("thead th")).map(th => ({
            text: th.innerText.trim(),
            width: Math.round(th.getBoundingClientRect().width)
          }));

          const firstRow = table.querySelector("tbody tr:first-child");
          const tds = firstRow ? Array.from(firstRow.querySelectorAll("td")).map(td => ({
            width: Math.round(td.getBoundingClientRect().width),
            scrollWidth: Math.round(td.scrollWidth),
            text: td.innerText.trim().slice(0, 25).replace(/[\\r\\n]+/g, ' ')
          })) : [];

          return {
            hasTable: true,
            cardWidth: card ? Math.round(card.getBoundingClientRect().width) : 0,
            wrapperClient: wrapper ? Math.round(wrapper.clientWidth) : 0,
            wrapperScroll: wrapper ? Math.round(wrapper.scrollWidth) : 0,
            tableClient: Math.round(table.clientWidth),
            tableScroll: Math.round(table.scrollWidth),
            overflow: wrapper ? wrapper.scrollWidth - wrapper.clientWidth : 0,
            cols: ths,
            tds
          };
        })()`,
        returnByValue: true
      });

      console.log(`\n=== Stage / Page: ${stage.name} ===`);
      const res = info.result?.value || info.result?.result?.value || info.value;
      if (!res || !res.hasTable) {
        console.log("  No table found on this page.", JSON.stringify(info));
      } else {
        console.log(`  Container: ${res.wrapperClient}px | Table Width: ${res.tableClient}px | Overflow: ${res.overflow}px`);
        console.log("  Headers:", res.cols.map(c => `${c.text}: ${c.width}px`).join(" | "));
        if (res.tds.length) {
          console.log("  Cells:  ", res.tds.map(t => `${t.text}: ${t.width}px`).join(" | "));
        }
      }
    }

  } finally {
    try { chromeProc.kill(); } catch {}
    try { fs.rmSync(TEMP_PROFILE, { recursive: true, force: true }); } catch {}
    process.exit(0);
  }
}

run();
