const { test, expect } = require("@playwright/test");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const RUN_ID = process.env.RUN_ID || "local";
const SHOT_DIR = path.join("test-results", "screenshots", RUN_ID);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function normalizeTitle(text) {
  return text.replace(/^\d+\)\s*/, "");
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function saveShot(page, testInfo, name) {
  ensureDir(SHOT_DIR);
  const title = normalizeTitle(testInfo.title);
  const project = testInfo.project && testInfo.project.name ? testInfo.project.name : "browser";
  const file = path.join(SHOT_DIR, `${slugify(title)}-${project}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function loginAsAdmin(page) {
  await page.goto("/");
  await page.fill("#username", "admin");
  await page.fill("#password", "admin123");
  await page.click("#loginBtn");
  await expect(page).toHaveURL(/\/employees/);
}

async function waitForTable(page) {
  await page.waitForSelector("#tbody");
}

async function searchEmployee(page, id) {
  await Promise.all([
    page.waitForResponse(r => r.url().includes("/api/employees") && r.request().method() === "GET"),
    page.fill("#search", id),
  ]);
}

async function createEmployee(page, id, name, email) {
  await page.fill("#id", id);
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.selectOption("#dept", "Engineering");
  await page.selectOption("#role", "Developer");
  await page.selectOption("#status", "Active");
  await Promise.all([
    page.waitForResponse(r => r.url().includes("/api/employees") && r.request().method() === "POST"),
    page.click("#saveBtn"),
  ]);
}

test.describe.serial("QA Suite - 6 core checks", () => {
  test.setTimeout(45_000);
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await saveShot(page, testInfo, "failed");
    }
  });

  test("1) Start and stop the application and verify", async ({ page }, testInfo) => {
    // Start server on a separate port and verify it responds, then stop it.
    const serverScript = path.join(__dirname, "..", "backend", "server.js");
    const server = spawn(process.execPath, [serverScript], {
      env: { ...process.env, PORT: "3001" },
      stdio: ["ignore", "pipe", "pipe"],
      shell: false
    });

    const base = "http://127.0.0.1:3001";
    let ready = false;
    for (let i = 0; i < 20; i += 1) {
      try {
        const res = await fetch(base);
        if (res.ok) {
          ready = true;
          break;
        }
      } catch {
        // retry
      }
      await new Promise(r => setTimeout(r, 300));
    }

    expect(ready).toBeTruthy();
    await page.goto(`${base}/`);
    await expect(page.locator("text=Employee Manager")).toBeVisible();

    const logs = [];
    const startedAt = new Date().toISOString();
    server.stdout.on("data", data => logs.push(data.toString().trim()));
    server.stderr.on("data", data => logs.push(data.toString().trim()));

    server.kill();
    const exited = await new Promise(resolve => {
      const timer = setTimeout(() => resolve(false), 2000);
      server.on("exit", () => {
        clearTimeout(timer);
        resolve(true);
      });
    });

    let stopped = false;
    for (let i = 0; i < 6; i += 1) {
      try {
        const res = await fetch(base);
        if (!res.ok) {
          stopped = true;
          break;
        }
      } catch {
        stopped = true;
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    const stoppedAt = new Date().toISOString();
    expect(exited || stopped).toBeTruthy();
    await saveShot(page, testInfo, "start-stop");

    const logPath = path.join(SHOT_DIR, "start-stop-log.json");
    fs.writeFileSync(
      logPath,
      JSON.stringify({ startedAt, stoppedAt, logs }, null, 2),
      "utf-8"
    );
  });

  test("2) Login successfully with admin/admin123", async ({ page }, testInfo) => {
    await loginAsAdmin(page);
    await saveShot(page, testInfo, "login-success");
  });

  test("3) Add testing user after verifying it doesn't exist", async ({ page }, testInfo) => {
    const id = `TEST-${Date.now().toString().slice(-6)}`;
    await loginAsAdmin(page);
    await waitForTable(page);
    await searchEmployee(page, id);
    await expect(page.locator(`button[data-del="${id}"]`)).toHaveCount(0);

    await createEmployee(page, id, "Test User", `${id.toLowerCase()}@example.com`);
    await searchEmployee(page, id);
    await expect(page.locator(`button[data-del="${id}"]`)).toBeVisible();
    await saveShot(page, testInfo, "add-user");
  });

  test("4) Delete employee works (remove testing user)", async ({ page }, testInfo) => {
    const id = `DEL-${Date.now().toString().slice(-6)}`;
    await loginAsAdmin(page);
    await waitForTable(page);
    await createEmployee(page, id, "Delete User", `${id.toLowerCase()}@example.com`);
    await searchEmployee(page, id);
    await expect(page.locator(`button[data-del="${id}"]`)).toBeVisible();

    page.once("dialog", d => d.accept());
    await Promise.all([
      page.waitForResponse(r => r.url().includes(`/api/employees/${id}`) && r.request().method() === "DELETE"),
      page.click(`button[data-del="${id}"]`),
    ]);
    await searchEmployee(page, id);
    await expect(page.locator(`button[data-del="${id}"]`)).toHaveCount(0);
    await saveShot(page, testInfo, "delete-user");
  });

  test("5) Edit user works (add, edit, save, verify)", async ({ page }, testInfo) => {
    const id = `EDIT-${Date.now().toString().slice(-6)}`;
    await loginAsAdmin(page);
    await waitForTable(page);
    await createEmployee(page, id, "Edit User", `${id.toLowerCase()}@example.com`);
    await searchEmployee(page, id);
    await page.click(`button[data-edit="${id}"]`);
    await page.fill("#name", "Edit User Updated");
    await Promise.all([
      page.waitForResponse(r => r.url().includes(`/api/employees/${id}`) && r.request().method() === "PUT"),
      page.click("#saveBtn"),
    ]);

    await searchEmployee(page, id);
    await expect(page.locator("#tbody")).toContainText("Edit User Updated");
    await saveShot(page, testInfo, "edit-user");
  });

  test("6) Delete employee works again (cleanup another user)", async ({ page }, testInfo) => {
    const id = `DEL2-${Date.now().toString().slice(-6)}`;
    await loginAsAdmin(page);
    await waitForTable(page);
    await createEmployee(page, id, "Delete User 2", `${id.toLowerCase()}@example.com`);
    await searchEmployee(page, id);
    await expect(page.locator(`button[data-del="${id}"]`)).toBeVisible();

    page.once("dialog", d => d.accept());
    await Promise.all([
      page.waitForResponse(r => r.url().includes(`/api/employees/${id}`) && r.request().method() === "DELETE"),
      page.click(`button[data-del="${id}"]`),
    ]);
    await searchEmployee(page, id);
    await expect(page.locator(`button[data-del="${id}"]`)).toHaveCount(0);
    await saveShot(page, testInfo, "delete-user-2");
  });
});
