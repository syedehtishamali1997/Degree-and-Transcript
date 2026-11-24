import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TEMP_PROFILE = path.resolve(process.cwd(), ".tmp_chrome_debug2");

if (!fs.existsSync(TEMP_PROFILE)) {
  fs.mkdirSync(TEMP_PROFILE, { recursive: true });
}

async function run() {
  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9224",
    `--user-data-dir=${TEMP_PROFILE}`,
    "--disable-gpu",
    "about:blank"
  ], { stdio: "pipe" });

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch("http://127.0.0.1:9224/json/list");
    const targets = await listRes.json();
    const pageTarget = targets.find(t => t.type === "page") || targets[0];

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
    const pending = new Map();
    const networkErrors = [];

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
        console.log(`[CONSOLE ${data.params.type.toUpperCase()}]:`, text);
      }

      if (data.method === "Runtime.exceptionThrown") {
        const exc = data.params.exceptionDetails;
        console.error(`\n[JS EXCEPTION]:`, exc.text, exc.exception?.description || exc.exception?.value);
        if (exc.stackTrace) {
          console.error("Stack trace:", JSON.stringify(exc.stackTrace, null, 2));
        }
      }

      if (data.method === "Network.loadingFailed") {
        console.error(`[NETWORK FAILED]: ${data.params.requestId} ${data.params.errorText}`);
        networkErrors.push(data.params);
      }

      if (data.method === "Network.responseReceived") {
        if (data.params.response.status >= 400) {
          console.error(`[HTTP ${data.params.response.status}]: ${data.params.response.url}`);
        }
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

    // Wait 3 seconds for load and scripts
    await new Promise(r => setTimeout(r, 4000));

    const rootCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          return {
            html: document.documentElement.outerHTML.substring(0, 1000),
            scripts: Array.from(document.querySelectorAll('script')).map(s => s.src || s.innerHTML.substring(0, 100)),
            rootInnerHTML: document.getElementById('root')?.innerHTML || 'NOT_FOUND_OR_EMPTY'
          };
        })()
      `,
      returnByValue: true
    });

    console.log("\n--- Root Check ---");
    console.log("Root content:", rootCheck.result?.value?.rootInnerHTML);
    console.log("Scripts found:", rootCheck.result?.value?.scripts);

    ws.close();
  } catch (err) {
    console.error("Diagnostic error:", err);
  } finally {
    chromeProc.kill();
  }
}

run();
