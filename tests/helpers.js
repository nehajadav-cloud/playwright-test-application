const { expect } = require("@playwright/test");

async function login(page, { username, password }) {
  await page.goto("/");
  await page.fill("[data-testid=login-username]", username);
  await page.fill("[data-testid=login-password]", password);
  await page.click("[data-testid=login-submit]");
  await expect(page).toHaveURL(/\\/employees/);
}

module.exports = { login };
