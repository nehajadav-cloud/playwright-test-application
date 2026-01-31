# Employee Portal - Application Documentation

Author: Neha Jadav  
Version: 1.1.0  
Support: neha.jadav@gmail.com

## Overview
Employee Portal is a lightweight web application designed for QA learning and Playwright practice. It includes authentication, employee CRUD, search, and role-based access. The app is intentionally simple, deterministic, and testable.

## What This Application Is Used For
- Practice end-to-end UI testing with Playwright
- Validate CRUD workflows (create, edit, delete)
- Train on QA concepts: happy paths, negative tests, and regression checks
- Generate test execution reports with screenshots

## Key Features
- Login with admin/viewer roles
- Employees list with add/edit/delete
- Search and refresh controls
- Simple JSON-backed data store
- Test-ready selectors (`data-testid`)

## Screens and Prompts
1. **Login Screen** (`/`)
   - Username/password fields
   - Error messaging for invalid login

2. **Employees Screen** (`/employees`)
   - Form for add/edit
   - Table for list and delete
   - Search and refresh

3. **Docs Screen** (`/docs`)
   - In-app documentation

## How to Use
1. Install dependencies:
   - `npm install`
2. Start the app:
   - `npm run dev` (with live reload)
   - `npm start` (stable)
3. Login:
   - admin/admin123 (full access)
   - viewer/viewer123 (read-only where applicable)

## Architecture
- **Backend**: Node.js + Express
- **Frontend**: Static HTML/JS served by Express
- **Data**: JSON file (`backend/data/employees.json`)
- **Auth**: Cookie-based session stored in memory

## File Structure (High Level)
- `backend/server.js`: Express server and API routes
- `backend/public/*.html`: UI pages
- `backend/data/employees.json`: Data store
- `tests/`: Playwright tests
- `scripts/`: Automation scripts
- `docs/`: Documentation and reports

## Version Control & Release
- Use semantic versioning in `package.json`
- Record updates in `CHANGELOG.md`
- Tag releases in git when publishing

## Release Notes (Latest)
- Added QA test suite and Word reporting
- Added data-testid hooks for stability
- Added scripts for headful/headless runs

## Known Limitations
- Sessions are in-memory (restart clears login)
- JSON store is file-based (not multi-user safe)

## Support
For help or questions: neha.jadav@gmail.com
