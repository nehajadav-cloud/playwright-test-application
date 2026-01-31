const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "..");
const reportsDir = path.join(root, "docs", "test-reports");
const runId = new Date().toISOString().replace(/[:.]/g, "-");

if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

const reportDocx = path.join(reportsDir, `TestReport-${runId}.docx`);

const env = { ...process.env, RUN_ID: runId };

function runProject(projectName) {
  const jsonPath = path.join(reportsDir, `playwright-report-${runId}-${projectName}.json`);
  return new Promise((resolve) => {
    const cmd = "npx";
    const headful = process.env.HEADFUL === "1";
    const args = [
      "playwright",
      "test",
      "tests/qa-suite.spec.js",
      "--reporter=json",
      ...(headful ? ["--headed"] : []),
      "--workers=1",
      `--project=${projectName}`
    ];

    const child = spawn(cmd, args, { cwd: root, env, shell: true });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", data => {
      stdout += data.toString();
    });

    child.stderr.on("data", data => {
      stderr += data.toString();
    });

    child.on("close", code => {
      fs.writeFileSync(jsonPath, stdout, "utf-8");
      resolve({ code, stderr, jsonPath });
    });
  });
}

(async () => {
  const results = [];
  results.push(await runProject("chromium"));
  results.push(await runProject("firefox"));

  const pyArgs = [
    path.join(root, "scripts", "generate-test-report.py"),
    "--run-id",
    runId,
    "--out",
    reportDocx
  ];

  results.forEach(r => {
    pyArgs.push("--json", r.jsonPath);
  });

  const py = spawn("python", pyArgs, { cwd: root, shell: true });
  py.stdout.on("data", d => process.stdout.write(d));
  py.stderr.on("data", d => process.stderr.write(d));
  py.on("close", pyCode => {
    const failed = results.find(r => r.code !== 0);
    if (failed) {
      console.error(failed.stderr);
      process.exit(failed.code);
    }
    if (pyCode !== 0) process.exit(pyCode);
    console.log(`Report saved: ${reportDocx}`);
  });
})();
