const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("create, edit, and delete an employee", async ({ page }) => {
  await login(page, { username: "admin", password: "admin123" });

  const id = `E${Date.now().toString().slice(-6)}`;

  await page.fill("[data-testid=emp-id]", id);
  await page.fill("[data-testid=emp-name]", "Test User");
  await page.fill("[data-testid=emp-email]", `${id.toLowerCase()}@example.com`);
  await page.fill("[data-testid=emp-dept]", "QA");
  await page.fill("[data-testid=emp-role]", "Tester");
  await page.selectOption("[data-testid=emp-status]", "Active");
  await page.click("[data-testid=form-submit]");

  await expect(page.locator("[data-testid=form-success]")).toContainText("created");
  await page.fill("[data-testid=search]", id);
  await expect(page.locator(`[data-testid=row-${id}]`)).toBeVisible();

  await page.click(`[data-testid=edit-${id}]`);
  await page.fill("[data-testid=emp-name]", "Test User Updated");
  await page.click("[data-testid=form-submit]");
  await expect(page.locator("[data-testid=form-success]")).toContainText("updated");

  page.once("dialog", dialog => dialog.accept());
  await page.click(`[data-testid=delete-${id}]`);
  await page.fill("[data-testid=search]", id);
  await expect(page.locator(`[data-testid=row-${id}]`)).toHaveCount(0);
});

test("open employee detail page from list", async ({ page }) => {
  await login(page, { username: "admin", password: "admin123" });
  await page.click("[data-testid=employee-link-E1001]");
  await expect(page).toHaveURL(/\\/employees\\/E1001/);
  await expect(page.locator("[data-testid=details]")).toContainText("E1001");
});
