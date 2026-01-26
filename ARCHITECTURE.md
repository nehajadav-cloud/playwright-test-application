# Architecture

## Summary
- Node.js + Express server
- Static HTML front-end served from `backend/public`
- JSON file storage for employee data
- Cookie-based sessions (in-memory)

## Components
- **Server**: `backend/server.js`
  - Express app, auth, API routes, static files
  - QA middleware to simulate delays and failures
- **Data Store**: `backend/data/employees.json`
  - Seeded on first run if missing
- **UI**: HTML pages under `backend/public`
  - Login, Employees list, Employee detail, Docs

## Auth Flow
1) User submits login form
2) Server validates credentials
3) Server issues a cookie-based session
4) UI calls `/api/me` to render role-based controls

## Data Flow
1) UI requests `/api/employees` (with filters/sort/pagination)
2) Server reads JSON file and returns a page of data
3) UI renders results and supports CRUD actions

## QA Controls
- UI can attach `x-qa-*` headers to API calls
- Server simulates latency or failure for test scenarios

## Key Decisions
- In-memory sessions keep the app simple for testing
- JSON file storage makes data reset easy
- Static HTML keeps UI deterministic and easy to test
