import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import os from "node:os";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TEMP_PROFILE = path.join(os.tmpdir(), "casetrack_chrome_vite_test_" + Date.now());

if (!fs.existsSync(TEMP_PROFILE)) {
  fs.mkdirSync(TEMP_PROFILE, { recursive: true });
}

async function run() {
  console.log("=================================================");
  console.log("     TESTING VITE DEV SERVER (PORT 3000)         ");
  console.log("=================================================");

  // Spawn Vite dev server
  const viteProc = spawn("cmd.exe", ["/c", "npx", "vite", "--port", "3000", "--strictPort"], {
    stdio: "pipe"
  });

  viteProc.stdout.on("data", (d) => console.log(`[vite stdout]: ${d}`));
  viteProc.stderr.on("data", (d) => console.error(`[vite stderr]: ${d}`));

  // Wait 3 seconds for Vite to start
  await new Promise((r) => setTimeout(r, 3500));

  try {
    const res = await fetch("http://localhost:3000/");
    console.log("Vite dev server response:", res.status);
  } catch (err) {
    console.error("Vite server failed to respond:", err);
    viteProc.kill();
    return;
  }

  // Launch Chrome
  const chromeProc = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      "--remote-debugging-port=9226",
      `--user-data-dir=${TEMP_PROFILE}`,
      "--disable-gpu",
      "about:blank"
    ],
    { stdio: "pipe" }
  );

  await new Promise((r) => setTimeout(r, 2000));

  try {
    const listRes = await fetch("http://127.0.0.1:9226/json/list");
    const targets = await listRes.json();
    const pageTarget = targets.find((t) => t.type === "page") || targets[0];

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

      if (data.method === "Runtime.consoleAPICalled") {
        const text = data.params.args.map((a) => a.value || a.description || JSON.stringify(a)).join(" ");
        console.log(`[Vite Dev Console ${data.params.type.toUpperCase()}]: ${text}`);
      }

      if (data.method === "Runtime.exceptionThrown") {
        const exc = data.params.exceptionDetails;
        const msg = exc.exception ? exc.exception.description || exc.exception.value : exc.text;
        jsErrors.push(msg);
        console.error(`\n>>> [Vite Dev JS EXCEPTION]: ${msg}`);
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
    await send("Network.enable");

    console.log("Navigating to http://localhost:3000/#/dashboard...");
    await send("Page.navigate", { url: "http://localhost:3000/#/dashboard" });

    // Wait 3 seconds
    await new Promise((r) => setTimeout(r, 3000));

    const pageState = await send("Runtime.evaluate", {
      expression: `
        (() => {
          return {
            title: document.title,
            currentHash: window.location.hash,
            rootChildCount: document.getElementById('root')?.childElementCount || 0,
            hasAppWrapper: !!document.getElementById('appWrapper'),
            hasSidebar: !!document.getElementById('sidebar'),
            activeNav: document.querySelector('.sidebar-nav a.active')?.innerText || 'none',
            statCards: document.querySelectorAll('.stat-card').length
          };
        })()
      `,
      returnByValue: true
    });

    console.log("\n================ VITE DEV PAGE STATE ================");
    console.log(JSON.stringify(pageState.result?.value, null, 2));

    const navRoutes = [
      "#/students/all",
      "#/students/pending",
      "#/students/case-ready",
      "#/students/sent",
      "#/students/returned",
      "#/students/received",
      "#/history",
      "#/data-management",
      "#/settings"
    ];

    console.log("\n================ TESTING ALL 10 ROUTES IN VITE DEV ================");
    for (const h of navRoutes) {
      await send("Runtime.evaluate", { expression: `window.location.hash = '${h}';` });
      await new Promise((r) => setTimeout(r, 800));

      const navState = await send("Runtime.evaluate", {
        expression: `
          (() => {
            return {
              hash: window.location.hash,
              cards: document.querySelectorAll('.card').length,
              activeLink: document.querySelector('.sidebar-nav a.active .nav-label')?.innerText || ''
            };
          })()
        `,
        returnByValue: true
      });
      console.log(`Vite Route [${h}]:`, navState.result?.value);
    }

    console.log("\nTotal Vite Dev Exceptions:", jsErrors.length);
    ws.close();
  } catch (err) {
    console.error("Vite test error:", err);
  } finally {
    chromeProc.kill();
    viteProc.kill();
  }
}

run();
