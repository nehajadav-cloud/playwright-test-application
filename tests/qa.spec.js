const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("qa failure toggle shows error state", async ({ page }) => {
  await login(page, { username: "admin", password: "admin123" });

  await page.check("[data-testid=qa-fail]");
  await page.click("[data-testid=qa-save]");

  await page.fill("[data-testid=search]", "E1001");
  await expect(page.locator("[data-testid=table-error]")).toContainText("Failed to load employees");
});
