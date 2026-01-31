const { test, expect } = require("@playwright/test");

test("login with admin credentials", async ({ page }) => {
  await page.goto("/");
  await page.fill("#username", "admin");
  await page.fill("#password", "admin123");
  await page.click("#loginBtn");
  await expect(page).toHaveURL(/\/employees/);
});
