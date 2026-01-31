const { test, expect } = require("@playwright/test");
const { login } = require("./helpers");

test.skip("qa failure toggle shows error state", async ({ page }) => {
  // Current UI does not include QA toggles; covered in qa-suite.spec.js.
});
