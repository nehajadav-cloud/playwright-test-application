const { chromium, firefox } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const VIDEO_DIR = path.join(ROOT, "demo-videos", RUN_ID);

const SLOW_MO_MS = 400;
const STEP_PAUSE_MS = 600;
const TYPE_DELAY_MS = 140;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(url, retries = 30) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // retry
    }
    await sleep(300);
  }
  return false;
}

function startServer(port) {
  const serverScript = path.join(ROOT, "backend", "server.js");
  const logs = [`[${new Date().toISOString()}] Server starting on port ${port}...`];
  const proc = spawn(process.execPath, [serverScript], {
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
    shell: false
  });
  proc.stdout.on("data", d => logs.push("[stdout] " + d.toString().trim()));
  proc.stderr.on("data", d => logs.push("[stderr] " + d.toString().trim()));
  return { proc, logs, startedAt: new Date().toISOString() };
}

async function ensureOverlay(page) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await page.evaluate(() => {
    if (document.getElementById("demo-overlay")) return;
    const style = document.createElement("style");
    style.textContent = `
      #demo-overlay {
        position: fixed; inset: 0; display: none; align-items: center; justify-content: center;
        background: rgba(0,0,0,0.65); color: #fff; z-index: 9999; font-family: system-ui, -apple-system, sans-serif;
      }
      #demo-overlay .box {
        background: #111; border: 2px solid #4f46e5; border-radius: 12px; padding: 24px 32px; text-align: center;
        box-shadow: 0 12px 24px rgba(0,0,0,0.4); min-width: 420px;
      }
      #demo-overlay h1 { margin: 0 0 8px 0; font-size: 28px; }
      #demo-overlay p { margin: 6px 0; font-size: 14px; opacity: 0.9; }
      #demo-banner {
        position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 9999;
        background: #16a34a; color: #fff; padding: 10px 16px; border-radius: 999px; display: none;
        font-family: Arial, sans-serif; font-weight: 700;
        pointer-events: none;
      }
      #demo-dot {
        position: fixed; width: 20px; height: 20px; border-radius: 50%;
        background: #eab308; box-shadow: 0 0 16px #eab308; z-index: 99998; display: none;
        pointer-events: none;
      }
      .demo-highlight {
        outline: 4px solid #eab308 !important;
        box-shadow: 0 0 20px #eab308 !important;
        animation: demoBlink 0.5s ease-in-out 3;
        position: relative;
        z-index: 9999;
      }
      @keyframes demoBlink { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
      #demo-summary {
        position: fixed; inset: 0; background: rgba(0,0,0,0.85); color: #fff; z-index: 9999; display: none;
        font-family: Arial, sans-serif; padding: 32px;
      }
      #demo-summary h1 { margin-top: 0; }
      #demo-summary ul { list-style: none; padding: 0; }
      #demo-summary li { margin: 8px 0; }
      #demo-exit { margin-top: 18px; padding: 10px 16px; font-size: 16px; cursor: pointer; }
      #demo-splash {
        position: fixed; inset: 0; z-index: 10000; display: flex; flex-direction: column;
        font-family: system-ui, -apple-system, sans-serif; color: #fff; box-sizing: border-box;
        background-color: #0d2818;
        background-image: 
          radial-gradient(ellipse at 20% 80%, rgba(45,157,120,0.3) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, rgba(45,157,120,0.2) 0%, transparent 50%),
          linear-gradient(160deg, #0d2818 0%, #04471c 30%, #0d2818 50%, #134f26 70%, #0d2818 100%);
      }
      #demo-splash-scroll { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; align-items: center; min-height: 0; }
      #demo-splash-footer { flex-shrink: 0; padding: 16px 20px; text-align: center; border-top: 1px solid rgba(255,255,255,0.15); }
      #demo-splash-inner { display: flex; flex-direction: column; align-items: center; max-width: 560px; }
      #demo-splash-title { font-size: 22px; font-weight: 700; margin-bottom: 12px; text-align: center; text-shadow: 0 2px 8px rgba(0,0,0,0.5); }
      #demo-splash-table { border-collapse: collapse; width: 100%; max-width: 520px; background: rgba(0,0,0,0.5); border-radius: 12px; overflow: hidden; margin-bottom: 12px; }
      #demo-splash-table th, #demo-splash-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
      #demo-splash-table th { background: rgba(45,157,120,0.3); font-weight: 600; }
      #demo-splash-table tr:last-child td { border-bottom: none; }
      .status-pending { color: #94a3b8; }
      .status-success { color: #4ade80; font-weight: 600; }
      .status-failed { color: #f87171; font-weight: 600; }
      .status-skipped { color: #fbbf24; }
      #demo-splash-log { font-size: 11px; font-family: monospace; background: rgba(0,0,0,0.6); padding: 10px; border-radius: 8px; max-height: 80px; overflow-y: auto; margin-top: 8px; text-align: left; }
      #demo-splash-countdown { font-size: 32px; font-weight: 700; margin: 8px 0; color: #2D9D78; min-height: 36px; }
      #demo-splash-next {
        padding: 14px 36px; font-size: 18px; font-weight: 700; cursor: pointer;
        background: #2D9D78; color: #fff; border: 2px solid #fff; border-radius: 10px;
        box-shadow: 0 4px 12px rgba(45,157,120,0.5);
        pointer-events: auto;
      }
      #demo-splash-next:hover { background: #38b889; }
      #demo-splash-next:disabled { opacity: 0.6; cursor: not-allowed; }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement("div");
    overlay.id = "demo-overlay";
    overlay.innerHTML = `<div class="box"><h1>Demo</h1><p>Loading...</p></div>`;
    document.body.appendChild(overlay);

    const banner = document.createElement("div");
    banner.id = "demo-banner";
    document.body.appendChild(banner);

    const dot = document.createElement("div");
    dot.id = "demo-dot";
    document.body.appendChild(dot);

    const splash = document.createElement("div");
    splash.id = "demo-splash";
    splash.style.display = "none";
    splash.innerHTML = `<div id="demo-splash-scroll"><div id="demo-splash-inner"><div id="demo-splash-title"></div><table id="demo-splash-table"><thead><tr><th>#</th><th>Check</th><th>Status</th></tr></thead><tbody id="demo-splash-tbody"></tbody></table><div id="demo-splash-log"></div></div></div><div id="demo-splash-footer"><div id="demo-splash-countdown"></div><button type="button" id="demo-splash-next">Start</button></div>`;
    document.body.appendChild(splash);

    const summary = document.createElement("div");
    summary.id = "demo-summary";
    summary.innerHTML = `<h1>Demo Summary</h1><ul id="demo-summary-list"></ul><button id="demo-exit">Exit</button>`;
    document.body.appendChild(summary);
  });
      return;
    } catch (e) {
      if (attempt === 4) throw e;
      await sleep(300 * (attempt + 1));
    }
  }
}

async function showOverlay(page, title, lines) {
  await ensureOverlay(page);
  await page.evaluate(({ title, lines }) => {
    const overlay = document.getElementById("demo-overlay");
    if (!overlay) return;
    overlay.style.display = "flex";
    overlay.querySelector("h1").textContent = title;
    overlay.querySelector("p").textContent = lines.join(" • ");
  }, { title, lines });
}

async function hideOverlay(page) {
  await page.evaluate(() => {
    const overlay = document.getElementById("demo-overlay");
    if (overlay) overlay.style.display = "none";
  });
}

async function updateSplashContent(page, browserName, testNames, results, buttonText, serverLogs) {
  const statuses = testNames.map((_, i) => {
    if (!results[i]) return "To be done";
    const s = results[i].status;
    return s === "passed" ? "Success" : s === "failed" ? "Failed" : s;
  });
  const allDone = results.length === testNames.length;
  const titleText = allDone
    ? `Playwright Demo Mode - Complete (${browserName})`
    : `Playwright Demo Mode is starting shortly on browser ${browserName}!`;
  const logText = Array.isArray(serverLogs) && serverLogs.length > 0
    ? serverLogs.join("\n")
    : "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await page.evaluate(({ titleText, testNames, statuses, buttonText, logText }) => {
        const title = document.getElementById("demo-splash-title");
        const tbody = document.getElementById("demo-splash-tbody");
        const countdown = document.getElementById("demo-splash-countdown");
        const logEl = document.getElementById("demo-splash-log");
        const btn = document.getElementById("demo-splash-next");
        if (!title || !tbody || !btn) return;
        title.textContent = titleText;
        tbody.innerHTML = testNames
          .map((name, i) => {
            const status = statuses[i] || "To be done";
            const cls = status === "Success" ? "status-success" : status === "Failed" ? "status-failed" : status === "Skipped" ? "status-skipped" : "status-pending";
            return `<tr><td>${i + 1}</td><td>${name}</td><td class="${cls}">${status}</td></tr>`;
          })
          .join("");
        if (countdown) countdown.textContent = "";
        if (logEl) {
          logEl.textContent = logText;
          logEl.style.display = logText ? "block" : "none";
        }
        btn.textContent = buttonText;
        btn.disabled = false;
      }, { titleText, testNames, statuses, buttonText, logText });
      return;
    } catch (e) {
      if (attempt === 4) throw e;
      await sleep(200 * (attempt + 1));
    }
  }
}

async function showSplash(page) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await page.evaluate(() => {
        const splash = document.getElementById("demo-splash");
        if (splash) {
          splash.style.display = "flex";
          splash.style.visibility = "visible";
          splash.style.opacity = "1";
        }
      });
      return;
    } catch (e) {
      if (attempt === 4) throw e;
      await sleep(200 * (attempt + 1));
    }
  }
}

async function hideSplash(page) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const splash = page.locator("#demo-splash");
      if (await splash.count() > 0) {
        await splash.evaluate((el) => {
          el.style.display = "none";
          el.style.visibility = "hidden";
        });
      }
      return;
    } catch (e) {
      if (attempt === 4) return;
      await sleep(150 * (attempt + 1));
    }
  }
}

async function runCountdownOnSplash(page) {
  for (const n of ["3", "2", "1"]) {
    await page.evaluate((num) => {
      const el = document.getElementById("demo-splash-countdown");
      if (el) el.textContent = `Starting in ${num}...`;
    }, n);
    await sleep(900);
  }
}

async function waitForNextClick(page) {
  await page.waitForSelector("#demo-splash-next", { state: "visible", timeout: 10000 }).catch(() => {});
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await page.evaluate(() => {
        window.__demoNextClicked = false;
        const btn = document.getElementById("demo-splash-next");
        if (btn) {
          const handler = () => {
            btn.disabled = true;
            btn.onclick = null;
            window.__demoNextClicked = true;
          };
          btn.onclick = handler;
        }
      });
      break;
    } catch (e) {
      if (attempt === 4) throw e;
      await sleep(200 * (attempt + 1));
    }
  }
  await Promise.race([
    page.waitForFunction(() => window.__demoNextClicked === true, null, { timeout: 300000 }),
    page.waitForSelector("#demo-splash-next[disabled]", { timeout: 300000 })
  ]).catch(() => {});
  try {
    await page.evaluate(() => { window.__demoNextClicked = false; });
  } catch {
    // Ignore
  }
}

async function moveDotTo(page, selector) {
  await ensureOverlay(page);
  const box = await page.locator(selector).boundingBox();
  if (!box) return;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.evaluate(({ x, y }) => {
    const dot = document.getElementById("demo-dot");
    if (!dot) return;
    dot.style.display = "block";
    dot.style.left = `${x - 10}px`;
    dot.style.top = `${y - 10}px`;
  }, { x, y });
  await page.mouse.move(x, y);
  await sleep(200);
}

async function highlight(page, selector) {
  await page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.add("demo-highlight");
    setTimeout(() => el.classList.remove("demo-highlight"), 1200);
  }, selector);
}

async function click(page, selector) {
  await moveDotTo(page, selector);
  await highlight(page, selector);
  const locator = page.locator(selector);
  await locator.waitFor({ state: "visible" });
  await locator.scrollIntoViewIfNeeded();
  await locator.click({ trial: true });
  try {
    await locator.click();
  } catch {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.click();
    }, selector);
  }
  await sleep(STEP_PAUSE_MS);
}

async function fill(page, selector, value) {
  await moveDotTo(page, selector);
  await highlight(page, selector);
  const locator = page.locator(selector);
  await locator.waitFor({ state: "visible" });
  await locator.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(value, { delay: TYPE_DELAY_MS });
  await sleep(STEP_PAUSE_MS);
}

async function select(page, selector, value) {
  await moveDotTo(page, selector);
  await highlight(page, selector);
  await page.selectOption(selector, value);
  await sleep(STEP_PAUSE_MS);
}

async function runDemoForBrowser(browserName, browserType) {
  ensureDir(VIDEO_DIR);
  const launchOpts = { headless: false, slowMo: SLOW_MO_MS };
  if (browserName === "chromium") launchOpts.args = ["--start-maximized"];
  const browser = await browserType.launch(launchOpts);
  const context = await browser.newContext({
    recordVideo: { dir: path.join(VIDEO_DIR, browserName) },
    viewport: browserName === "chromium" ? null : { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  if (browserName === "firefox") await page.setViewportSize({ width: 1920, height: 1080 });

  const results = [];

  // Start main server on 3000 if not already running
  const mainUrl = "http://127.0.0.1:3000";
  if (!(await waitForServer(mainUrl))) {
    const mainServer = startServer(3000);
    await waitForServer(mainUrl);
    // keep running; will exit at end
    context.on("close", () => mainServer.proc.kill());
  }

  await page.goto(mainUrl, { waitUntil: "load" });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector("body", { state: "attached" });
  await ensureOverlay(page);
  await sleep(300);

  const testNames = [
    "Start/Stop application",
    "Login as admin",
    "Add testing user",
    "Delete testing user",
    "Edit employee",
    "Delete testing user again"
  ];

  await updateSplashContent(page, browserName, testNames, results, "Start");
  await showSplash(page);
  await waitForNextClick(page);

  const tests = [
    {
      name: "Start/Stop application",
      expected: "App starts and stops cleanly",
      run: async () => {
        const demo = startServer(3001);
        const ok = await waitForServer("http://127.0.0.1:3001");
        if (!ok) throw new Error("Server did not start");
        await page.goto("http://127.0.0.1:3001/");
        await page.locator("text=Employee Manager").waitFor();
        demo.logs.push("[stdout] Running: http://127.0.0.1:3001");
        demo.proc.kill();
        await sleep(500);
        demo.logs.push(`[${new Date().toISOString()}] Server stopped`);
        await page.goto(mainUrl, { waitUntil: "load" });
        await page.waitForSelector("[data-testid=login-username]", { timeout: 10000 });
        return { logs: demo.logs };
      }
    },
    {
      name: "Login as admin",
      expected: "Reach Employees page",
      run: async () => {
        await page.goto(mainUrl, { waitUntil: "load", timeout: 15000 });
        await page.waitForLoadState("load");
        await page.waitForSelector("[data-testid=login-username]", { timeout: 10000 });
        await fill(page, "[data-testid=login-username]", "admin");
        await fill(page, "[data-testid=login-password]", "admin123");
        const [resp] = await Promise.all([
          page.waitForResponse(r => r.url().includes("/api/login") && r.request().method() === "POST"),
          click(page, "[data-testid=login-submit]")
        ]);
        if (!resp.ok()) {
          const text = await resp.text();
          throw new Error(`Login failed: ${resp.status()} ${text}`);
        }
        await page.waitForURL(/\/employees/, { timeout: 10000 });
      }
    },
    {
      name: "Add testing user",
      expected: "New employee appears in table",
      run: async () => {
        const id = `DEMO-${Date.now().toString().slice(-6)}`;
        await fill(page, "[data-testid=search]", id);
        await fill(page, "[data-testid=emp-id]", id);
        await fill(page, "[data-testid=emp-name]", "Demo User");
        await fill(page, "[data-testid=emp-email]", `${id.toLowerCase()}@example.com`);
        await select(page, "[data-testid=emp-dept]", "Engineering");
        await select(page, "[data-testid=emp-role]", "Developer");
        await select(page, "[data-testid=emp-status]", "Active");
        await click(page, "[data-testid=form-submit]");
        await fill(page, "[data-testid=search]", id);
        await page.locator(`button[data-del="${id}"]`).waitFor();
      }
    },
    {
      name: "Delete testing user",
      expected: "Employee removed",
      run: async () => {
        const id = `DEL-${Date.now().toString().slice(-6)}`;
        await fill(page, "[data-testid=emp-id]", id);
        await fill(page, "[data-testid=emp-name]", "Delete User");
        await fill(page, "[data-testid=emp-email]", `${id.toLowerCase()}@example.com`);
        await click(page, "[data-testid=form-submit]");
        await fill(page, "[data-testid=search]", id);
        page.once("dialog", d => d.accept());
        await click(page, `button[data-del="${id}"]`);
        await fill(page, "[data-testid=search]", id);
      }
    },
    {
      name: "Edit employee",
      expected: "Updated name shows",
      run: async () => {
        const id = `EDIT-${Date.now().toString().slice(-6)}`;
        await fill(page, "[data-testid=emp-id]", id);
        await fill(page, "[data-testid=emp-name]", "Edit User");
        await fill(page, "[data-testid=emp-email]", `${id.toLowerCase()}@example.com`);
        await click(page, "[data-testid=form-submit]");
        await fill(page, "[data-testid=search]", id);
        await click(page, `button[data-edit="${id}"]`);
        await fill(page, "[data-testid=emp-name]", "Edit User Updated");
        await click(page, "[data-testid=form-submit]");
        await fill(page, "[data-testid=search]", id);
        await page.locator("#tbody").waitFor();
      }
    },
    {
      name: "Delete testing user again",
      expected: "Cleanup employee removed",
      run: async () => {
        const id = `DEL2-${Date.now().toString().slice(-6)}`;
        await fill(page, "[data-testid=emp-id]", id);
        await fill(page, "[data-testid=emp-name]", "Delete User 2");
        await fill(page, "[data-testid=emp-email]", `${id.toLowerCase()}@example.com`);
        await click(page, "[data-testid=form-submit]");
        await fill(page, "[data-testid=search]", id);
        page.once("dialog", d => d.accept());
        await click(page, `button[data-del="${id}"]`);
        await fill(page, "[data-testid=search]", id);
      }
    }
  ];

  let lastServerLogs = null;
  for (let i = 0; i < tests.length; i += 1) {
    const t = tests[i];
    if (i === 0) await runCountdownOnSplash(page);
    await hideSplash(page);
    await sleep(100);
    if (i === 1) await page.goto(mainUrl, { waitUntil: "load", timeout: 15000 }).catch(() => {});
    if (i >= 2) await page.goto(`${mainUrl}/employees`, { waitUntil: "load", timeout: 15000 }).catch(() => {});
    try {
      const ret = await t.run();
      results.push({ name: t.name, status: "passed" });
      if (ret && Array.isArray(ret.logs)) lastServerLogs = ret.logs;
    } catch (err) {
      results.push({ name: t.name, status: "failed", error: err.message });
    }
    await page.waitForLoadState("load").catch(() => {});
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForSelector("body", { state: "attached", timeout: 5000 }).catch(() => {});
    await sleep(500);
    await ensureOverlay(page);
    await sleep(150);
    const isLast = i === tests.length - 1;
    const logsToShow = i === 0 ? lastServerLogs : null;
    await updateSplashContent(page, browserName, testNames, results, isLast ? "Exit" : "Next", logsToShow);
    await showSplash(page);
    await waitForNextClick(page);
    lastServerLogs = null;
  }

  await context.close();
  await browser.close();
}

async function main() {
  ensureDir(VIDEO_DIR);
  await runDemoForBrowser("chromium", chromium);
  await runDemoForBrowser("firefox", firefox);
  console.log(`Demo videos saved to ${VIDEO_DIR}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
