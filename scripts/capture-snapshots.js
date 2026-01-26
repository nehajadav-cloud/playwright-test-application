const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT, "docs");
const BASE_URL = "http://127.0.0.1:3000";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(retries = 30) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(`${BASE_URL}/`);
      if (res.ok) return true;
    } catch {
      // keep retrying
    }
    await sleep(500);
  }
  return false;
}

async function main() {
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

  const server = spawn("node", ["backend/server.js"], {
    cwd: ROOT,
    stdio: "ignore",
    shell: true
  });

  const ready = await waitForServer();
  if (!ready) {
    server.kill();
    throw new Error("Server did not start in time.");
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Login page
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.screenshot({ path: path.join(DOCS_DIR, "login.png"), fullPage: true });

  // Employees list
  await page.fill("[data-testid=login-username]", "admin");
  await page.fill("[data-testid=login-password]", "admin123");
  await page.click("[data-testid=login-submit]");
  await page.waitForSelector("[data-testid=user-info]");
  await page.screenshot({ path: path.join(DOCS_DIR, "employees.png"), fullPage: true });

  // Employee detail
  await page.click("[data-testid=employee-link-E1001]");
  await page.waitForSelector("[data-testid=details]");
  await page.screenshot({ path: path.join(DOCS_DIR, "employee.png"), fullPage: true });

  await browser.close();
  server.kill();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
