const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test("login succeeds for admin", async ({ page }) => {
  await login(page, { username: "admin", password: "admin123" });
  await expect(page.locator("[data-testid=user-info]")).toContainText("admin");
});

test("login fails with invalid credentials", async ({ page }) => {
  await page.goto("/");
  await page.fill("[data-testid=login-username]", "admin");
  await page.fill("[data-testid=login-password]", "wrong");
  await page.click("[data-testid=login-submit]");
  await expect(page.locator("[data-testid=login-error]")).toContainText("Invalid");
});

test("viewer role disables admin controls", async ({ page }) => {
  await login(page, { username: "viewer", password: "viewer123" });
  await expect(page.locator("[data-testid=form-submit]")).toBeDisabled();
  await expect(page.locator("[data-testid=bulk-delete]")).toBeDisabled();
});
