const { expect } = require("@playwright/test");

async function login(page, { username, password }) {
  await page.goto("/");
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click("#loginBtn");
  await expect(page).toHaveURL(/\/employees/);
}

module.exports = { login };
