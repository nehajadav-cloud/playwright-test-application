const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());

const USERS = [
  { username: "admin", password: "admin123", role: "admin" },
  { username: "viewer", password: "viewer123", role: "viewer" },
];

const SESSION_TTL_MS = 1000 * 60 * 30; // 30 minutes
const REMEMBER_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const sessions = new Map();

function createSession(user, remember) {
  const token = crypto.randomUUID();
  const ttl = remember ? REMEMBER_TTL_MS : SESSION_TTL_MS;
  const expiresAt = Date.now() + ttl;
  sessions.set(token, { username: user.username, role: user.role, expiresAt });
  return { token, ttl };
}

function getSession(req) {
  const token = req.cookies && req.cookies.session;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return { token, ...session };
}

function requireAuth(req, res, next) {
  if (req.user) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (req.user.role !== role) return res.status(403).json({ error: "Forbidden" });
    return next();
  };
}

// Attach user from session
app.use((req, res, next) => {
  const session = getSession(req);
  req.user = session ? { username: session.username, role: session.role } : null;
  return next();
});

// QA middleware: simulate delay/failure for API requests
app.use("/api", (req, res, next) => {
  const delayHeader = req.header("x-qa-delay");
  const failHeader = req.header("x-qa-fail");
  const failRateHeader = req.header("x-qa-fail-rate");
  const delayParam = req.query.__delay;
  const failParam = req.query.__fail;

  const delayMs = Math.max(0, parseInt(delayHeader || delayParam || "0", 10));
  const failFlag = (failHeader || failParam || "").toString().toLowerCase();
  const failRate = Math.max(0, Math.min(1, parseFloat(failRateHeader || "0")));
  const shouldFail = failFlag === "1" || failFlag === "true" || (failRate > 0 && Math.random() < failRate);

  const run = () => {
    if (shouldFail) return res.status(503).json({ error: "Simulated failure" });
    return next();
  };

  if (delayMs > 0) return setTimeout(run, delayMs);
  return run();
});

const dataFile = path.join(__dirname, "data", "employees.json");

function readEmployees() {
  if (!fs.existsSync(dataFile)) return [];
  return JSON.parse(fs.readFileSync(dataFile, "utf-8"));
}

function writeEmployees(rows) {
  fs.writeFileSync(dataFile, JSON.stringify(rows, null, 2));
}

if (!fs.existsSync(dataFile)) {
  writeEmployees([
    { id: "E1001", name: "Ava Patel", email: "ava@company.com", dept: "Engineering", role: "Developer", status: "Active" },
    { id: "E1002", name: "Noah Kim", email: "noah@company.com", dept: "Finance", role: "Analyst", status: "Active" },
    { id: "E1003", name: "Mia Singh", email: "mia@company.com", dept: "HR", role: "Recruiter", status: "Inactive" },
  ]);
}

const ALLOWED_STATUS = ["Active", "Inactive", "On Leave"];
const ALLOWED_SORT = ["id", "name", "email", "dept", "role", "status"];

function validateEmployee(input, requireAll) {
  const errors = {};
  const value = {
    id: (input.id || "").toString().trim(),
    name: (input.name || "").toString().trim(),
    email: (input.email || "").toString().trim(),
    dept: (input.dept || "").toString().trim(),
    role: (input.role || "").toString().trim(),
    status: (input.status || "").toString().trim(),
  };

  if (requireAll || value.id) {
    if (!value.id) errors.id = "Employee ID is required";
  }

  if (requireAll || value.name) {
    if (!value.name) errors.name = "Name is required";
  }

  if (requireAll || value.email) {
    if (!value.email) errors.email = "Email is required";
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(value.email)) errors.email = "Email is invalid";
  }

  if (requireAll || value.dept) {
    if (!value.dept) errors.dept = "Department is required";
  }

  if (requireAll || value.role) {
    if (!value.role) errors.role = "Role is required";
  }

  if (requireAll || value.status) {
    if (!value.status) errors.status = "Status is required";
    else if (!ALLOWED_STATUS.includes(value.status)) errors.status = "Status must be Active, Inactive, or On Leave";
  }

  return { value, errors };
}

// Auth APIs
app.post("/api/login", (req, res) => {
  const { username, password, remember } = req.body || {};
  const user = USERS.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const session = createSession(user, Boolean(remember));
  res.cookie("session", session.token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: Boolean(remember) ? session.ttl : undefined,
  });
  return res.json({ ok: true, role: user.role, username: user.username });
});

app.post("/api/logout", (req, res) => {
  const token = req.cookies && req.cookies.session;
  if (token) sessions.delete(token);
  res.clearCookie("session");
  res.json({ ok: true });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ username: req.user.username, role: req.user.role });
});

// Employee APIs
app.get("/api/employees", requireAuth, (req, res) => {
  const q = (req.query.q || "").toString().toLowerCase();
  const status = (req.query.status || "").toString().trim();
  const sortBy = ALLOWED_SORT.includes(req.query.sortBy) ? req.query.sortBy : "id";
  const sortDir = (req.query.sortDir || "asc").toString().toLowerCase() === "desc" ? "desc" : "asc";
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const pageSize = Math.max(1, Math.min(50, parseInt(req.query.pageSize || "10", 10)));

  let rows = readEmployees();

  if (q) {
    rows = rows.filter(e =>
      e.id.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.dept.toLowerCase().includes(q) ||
      e.role.toLowerCase().includes(q) ||
      e.status.toLowerCase().includes(q)
    );
  }

  if (status) rows = rows.filter(e => e.status === status);

  rows.sort((a, b) => {
    const left = (a[sortBy] || "").toString().toLowerCase();
    const right = (b[sortBy] || "").toString().toLowerCase();
    if (left < right) return sortDir === "asc" ? -1 : 1;
    if (left > right) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const total = rows.length;
  const start = (page - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize);

  res.json({
    rows: paged,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
});

app.get("/api/employees/:id", requireAuth, (req, res) => {
  const rows = readEmployees();
  const employee = rows.find(e => e.id === req.params.id);
  if (!employee) return res.status(404).json({ error: "Not found" });
  return res.json(employee);
});

app.post("/api/employees", requireAuth, requireRole("admin"), (req, res) => {
  const { value, errors } = validateEmployee(req.body || {}, true);
  if (Object.keys(errors).length) return res.status(400).json({ error: "Validation failed", fields: errors });

  const rows = readEmployees();
  if (rows.some(e => e.id === value.id)) {
    return res.status(409).json({ error: "Employee ID already exists" });
  }
  if (rows.some(e => e.email.toLowerCase() === value.email.toLowerCase())) {
    return res.status(409).json({ error: "Email already exists" });
  }

  rows.push(value);
  writeEmployees(rows);
  res.status(201).json({ ok: true });
});

app.put("/api/employees/:id", requireAuth, requireRole("admin"), (req, res) => {
  const { value, errors } = validateEmployee(req.body || {}, true);
  if (Object.keys(errors).length) return res.status(400).json({ error: "Validation failed", fields: errors });

  const rows = readEmployees();
  const idx = rows.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });

  if (rows.some((e, i) => i !== idx && e.id === value.id)) {
    return res.status(409).json({ error: "Employee ID already exists" });
  }
  if (rows.some((e, i) => i !== idx && e.email.toLowerCase() === value.email.toLowerCase())) {
    return res.status(409).json({ error: "Email already exists" });
  }

  rows[idx] = value;
  writeEmployees(rows);
  res.json({ ok: true });
});

app.delete("/api/employees/:id", requireAuth, requireRole("admin"), (req, res) => {
  const rows = readEmployees();
  const next = rows.filter(e => e.id !== req.params.id);
  if (next.length === rows.length) return res.status(404).json({ error: "Not found" });
  writeEmployees(next);
  res.json({ ok: true });
});

app.post("/api/employees/bulk", requireAuth, requireRole("admin"), (req, res) => {
  const { action, ids, status } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "ids must be a non-empty array" });
  }

  const rows = readEmployees();
  let updated = 0;

  if (action === "delete") {
    const remaining = rows.filter(e => !ids.includes(e.id));
    updated = rows.length - remaining.length;
    writeEmployees(remaining);
    return res.json({ ok: true, updated });
  }

  if (action === "status") {
    if (!ALLOWED_STATUS.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    rows.forEach(e => {
      if (ids.includes(e.id)) {
        e.status = status;
        updated += 1;
      }
    });
    writeEmployees(rows);
    return res.json({ ok: true, updated });
  }

  return res.status(400).json({ error: "Invalid bulk action" });
});

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/employees", (req, res) => res.sendFile(path.join(__dirname, "public", "employees.html")));
app.get("/employees/:id", (req, res) => res.sendFile(path.join(__dirname, "public", "employee.html")));

app.use((req, res) => {
  res.status(404).send("Not Found");
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Running: http://localhost:${PORT}`));

