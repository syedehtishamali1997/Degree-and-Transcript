import { spawn, fork } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TEMP_PROFILE = path.resolve(process.cwd(), ".tmp_chrome_server_test");

if (!fs.existsSync(TEMP_PROFILE)) {
  fs.mkdirSync(TEMP_PROFILE, { recursive: true });
}

async function run() {
  console.log("=================================================");
  console.log("   TESTING PRODUCTION SERVER + FRONTEND BUNDLE    ");
  console.log("=================================================");

  const SERVER_PORT = 5000;
  process.env.PORT = String(SERVER_PORT);

  const serverProc = fork("server.js", {
    env: { ...process.env, PORT: String(SERVER_PORT) },
    stdio: "pipe"
  });

  serverProc.stdout.on("data", (d) => console.log(`[server stdout]: ${d}`));
  serverProc.stderr.on("data", (d) => console.error(`[server stderr]: ${d}`));

  await new Promise((r) => setTimeout(r, 2000));

  // Verify server is answering
  try {
    const res = await fetch(`http://localhost:${SERVER_PORT}/api/health`);
    console.log("Health check status:", res.status, await res.json());

    const htmlRes = await fetch(`http://localhost:${SERVER_PORT}/`);
    console.log("Index HTML status:", htmlRes.status);
    const htmlText = await htmlRes.text();
    console.log("HTML snippet:", htmlText.substring(0, 200));
  } catch (err) {
    console.error("Server fetch failed:", err);
    serverProc.kill();
    return;
  }

  // Launch Chrome against http://localhost:5000/
  const chromeProc = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      "--remote-debugging-port=9225",
      `--user-data-dir=${TEMP_PROFILE}`,
      "--disable-gpu",
      "about:blank"
    ],
    { stdio: "pipe" }
  );

  await new Promise((r) => setTimeout(r, 2000));

  try {
    const listRes = await fetch("http://127.0.0.1:9225/json/list");
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
    const consoleLogs = [];

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
        consoleLogs.push({ type: data.params.type, text });
        console.log(`[Browser Console ${data.params.type.toUpperCase()}]: ${text}`);
      }

      if (data.method === "Runtime.exceptionThrown") {
        const exc = data.params.exceptionDetails;
        const msg = exc.exception ? exc.exception.description || exc.exception.value : exc.text;
        jsErrors.push(msg);
        console.error(`\n>>> [BROWSER JS EXCEPTION]: ${msg}`);
        if (exc.stackTrace) {
          console.error(JSON.stringify(exc.stackTrace, null, 2));
        }
      }

      if (data.method === "Network.loadingFailed") {
        console.error(`[Network Failed]: ${data.params.errorText}`);
      }

      if (data.method === "Network.responseReceived" && data.params.response.status >= 400) {
        console.error(`[HTTP ${data.params.response.status}]: ${data.params.response.url}`);
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

    console.log("Navigating to http://localhost:5000/#/dashboard...");
    await send("Page.navigate", { url: "http://localhost:5000/#/dashboard" });

    // Wait 3 seconds for scripts and rendering
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
            sidebarLinks: Array.from(document.querySelectorAll('.sidebar-nav a.nav-item')).map(a => ({
              label: a.querySelector('.nav-label')?.innerText || a.innerText,
              href: a.getAttribute('href')
            })),
            activeNav: document.querySelector('.sidebar-nav a.active')?.innerText || 'none',
            pageHeading: document.querySelector('h3')?.innerText || document.querySelector('.header-title')?.innerText || '',
            statCards: document.querySelectorAll('.stat-card').length,
            tableRows: document.querySelectorAll('tbody tr').length,
            localStorageKeys: Object.keys(localStorage)
          };
        })()
      `,
      returnByValue: true
    });

    console.log("\n================ PAGE STATE ON PORT 5000 ================");
    console.log(JSON.stringify(pageState.result?.value, null, 2));

    // Test clicking navigation items
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

    console.log("\n================ TESTING ALL ROUTES VIA HASH ================");
    for (const h of navRoutes) {
      await send("Runtime.evaluate", { expression: `window.location.hash = '${h}';` });
      await new Promise((r) => setTimeout(r, 1000));

      const navState = await send("Runtime.evaluate", {
        expression: `
          (() => {
            return {
              hash: window.location.hash,
              h3: document.querySelector('h3')?.innerText || '',
              tables: document.querySelectorAll('table').length,
              cards: document.querySelectorAll('.card').length,
              activeLink: document.querySelector('.sidebar-nav a.active .nav-label')?.innerText || ''
            };
          })()
        `,
        returnByValue: true
      });
      console.log(`Route [${h}]:`, navState.result?.value);
    }

    console.log("\nTotal Browser Exceptions Encountered:", jsErrors.length);
    ws.close();
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    chromeProc.kill();
    serverProc.kill();
  }
}

run();
