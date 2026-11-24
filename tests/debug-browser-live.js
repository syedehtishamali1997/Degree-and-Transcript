import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TEMP_PROFILE = path.resolve(process.cwd(), ".tmp_chrome_debug");

if (!fs.existsSync(TEMP_PROFILE)) {
  fs.mkdirSync(TEMP_PROFILE, { recursive: true });
}

async function run() {
  console.log("=================================================");
  console.log("   LIVE BROWSER DEEP DIAGNOSTIC & ROUTE TESTING   ");
  console.log("=================================================");

  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9223",
    `--user-data-dir=${TEMP_PROFILE}`,
    "--disable-gpu",
    "http://localhost:3000/#/dashboard"
  ], { stdio: "pipe" });

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch("http://127.0.0.1:9223/json/list");
    const targets = await listRes.json();
    console.log(`Found ${targets.length} targets. Looking for page target...`);
    const pageTarget = targets.find(t => t.type === "page") || targets[0];

    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
      throw new Error("No page WebSocket debugger URL found.");
    }

    console.log(`Connecting to page target: ${pageTarget.url}`);
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    console.log("CDP WebSocket connection established.");

    let msgId = 1;
    const pending = new Map();
    const consoleLogs = [];
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
        const text = data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(" ");
        consoleLogs.push({ type: data.params.type, text });
        console.log(`[Browser Console ${data.params.type.toUpperCase()}]: ${text}`);
      }

      if (data.method === "Runtime.exceptionThrown") {
        const exc = data.params.exceptionDetails;
        const errMsg = exc.exception ? (exc.exception.description || exc.exception.value) : exc.text;
        jsErrors.push(errMsg);
        console.error(`[Browser JS Uncaught Exception]: ${errMsg}`);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    // Enable domains
    await send("Runtime.enable");
    await send("Page.enable");
    await send("DOM.enable");

    // Wait 2 seconds for initial render
    await new Promise(r => setTimeout(r, 2000));

    // Evaluate initial DOM state
    const evalRes = await send("Runtime.evaluate", {
      expression: `
        (() => {
          return {
            title: document.title,
            url: window.location.href,
            rootChildCount: document.getElementById('root')?.childElementCount || 0,
            rootHTMLSnippet: document.getElementById('root')?.innerHTML.substring(0, 300) || '',
            hasAppWrapper: !!document.getElementById('appWrapper'),
            hasSidebar: !!document.getElementById('sidebar'),
            sidebarLinks: Array.from(document.querySelectorAll('.sidebar-nav a')).map(a => ({
              text: a.innerText.trim().replace(/\\s+/g, ' '),
              href: a.getAttribute('href')
            }))
          };
        })()
      `,
      returnByValue: true
    });

    console.log("\n--- Initial Page Render Status ---");
    console.log("Title:", evalRes.result?.value?.title);
    console.log("URL:", evalRes.result?.value?.url);
    console.log("Root Child Count:", evalRes.result?.value?.rootChildCount);
    console.log("Has AppWrapper:", evalRes.result?.value?.hasAppWrapper);
    console.log("Has Sidebar:", evalRes.result?.value?.hasSidebar);
    console.log("Sidebar Links found:", evalRes.result?.value?.sidebarLinks?.length);
    console.log("Links:", evalRes.result?.value?.sidebarLinks);

    // Test routes individually
    const testRoutes = [
      { name: "Dashboard", hash: "#/dashboard", checkSelector: ".stat-card" },
      { name: "All Students", hash: "#/students/all", checkSelector: "table" },
      { name: "Pending Cases", hash: "#/students/pending", checkSelector: "table" },
      { name: "Case Ready", hash: "#/students/case-ready", checkSelector: "table" },
      { name: "Sent to Campus", hash: "#/students/sent", checkSelector: "table" },
      { name: "Returned Cases", hash: "#/students/returned", checkSelector: "table" },
      { name: "Received Cases", hash: "#/students/received", checkSelector: "table" },
      { name: "Activity History", hash: "#/history", checkSelector: ".timeline, .table, h3" },
      { name: "Data Management", hash: "#/data-management", checkSelector: "h3" },
      { name: "Settings", hash: "#/settings", checkSelector: "h3" }
    ];

    console.log("\n--- Testing All 10 Routes via Client Hash Navigation ---");

    for (const route of testRoutes) {
      console.log(`\nNavigating to ${route.name} (${route.hash})...`);
      await send("Runtime.evaluate", {
        expression: `window.location.hash = '${route.hash}';`
      });

      // Wait 1 second for lazy chunk load / render
      await new Promise(r => setTimeout(r, 1200));

      const check = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const h3Text = document.querySelector('h3')?.innerText || '';
            const cardCount = document.querySelectorAll('.card').length;
            const tableRows = document.querySelectorAll('tbody tr').length;
            const spinnerPresent = !!document.querySelector('.spinner-border');
            return {
              currentHash: window.location.hash,
              h3Text,
              cardCount,
              tableRows,
              spinnerPresent,
              bodySnippet: document.querySelector('.content-body')?.innerText.substring(0, 150).replace(/\\s+/g, ' ') || ''
            };
          })()
        `,
        returnByValue: true
      });

      console.log(`  [Route Result for ${route.name}]:`, check.result?.value);
    }

    console.log("\n--- Testing Click Events on Sidebar Links ---");
    const clickTest = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const results = [];
          const links = Array.from(document.querySelectorAll('.sidebar-nav a.nav-item'));
          return links.map(l => ({
            label: l.querySelector('.nav-label')?.innerText || l.innerText,
            href: l.getAttribute('href'),
            rect: {
              width: l.getBoundingClientRect().width,
              height: l.getBoundingClientRect().height,
              top: l.getBoundingClientRect().top,
              left: l.getBoundingClientRect().left
            },
            pointerEvents: window.getComputedStyle(l).pointerEvents,
            isClickable: l.getBoundingClientRect().width > 0 && window.getComputedStyle(l).pointerEvents !== 'none'
          }));
        })()
      `,
      returnByValue: true
    });

    console.log("Sidebar Links Clickability Audit:");
    clickTest.result?.value?.forEach(l => {
      console.log(`  - ${l.label} (${l.href}): width=${l.rect.width}px, clickable=${l.isClickable}, pointerEvents=${l.pointerEvents}`);
    });

    // Check if any overlay is covering the sidebar or content
    const overlayCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          // Check elementFromPoint at sidebar center
          const sidebarElem = document.elementFromPoint(100, 200);
          const contentElem = document.elementFromPoint(500, 200);
          return {
            sidebarTopElement: sidebarElem ? { tag: sidebarElem.tagName, class: sidebarElem.className } : null,
            contentTopElement: contentElem ? { tag: contentElem.tagName, class: contentElem.className } : null
          };
        })()
      `,
      returnByValue: true
    });

    console.log("\n--- Element-From-Point (Overlay Blocking Check) ---");
    console.log("Top element at sidebar (100, 200):", overlayCheck.result?.value?.sidebarTopElement);
    console.log("Top element at content (500, 200):", overlayCheck.result?.value?.contentTopElement);

    console.log("\n--- Total JS Errors Recorded ---", jsErrors.length);
    if (jsErrors.length > 0) {
      console.error("Errors:", jsErrors);
    }

    ws.close();
  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    chromeProc.kill();
  }
}

run();
