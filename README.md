# Employee Portal (Playwright Practice App)

Author: Neha Jadav  
Support: neha.jadav@gmail.com

## Overview
This is a small, intentionally testable web app used to learn Playwright. It includes login, role-based access, CRUD flows, pagination, filters, error states, and QA toggles for deterministic test scenarios.

## Quick Start
```
npm install
npm run dev
```
Open: `http://127.0.0.1:3000/`

Test accounts:
- admin / admin123 (admin)
- viewer / viewer123 (viewer)

## Features
- Role-based auth (admin vs viewer)
- Employees list with search, filter, sort, pagination
- Create, edit, delete, and bulk actions (admin only)
- Employee detail page with edit/delete
- QA toggles for latency and failures
- `data-testid` hooks across UI

## Short Note: How to Start
1) Run `npm run dev`
2) Open the login page in a browser
3) Sign in as admin or viewer
4) Use the Employees page to exercise UI behavior

## Documentation
- In-app docs: `http://127.0.0.1:3000/docs`
- Architecture notes: `ARCHITECTURE.md`
- Files and their uses: `FILES.md`
- Change log: `CHANGELOG.md`
- Playwright training guide: `docs/Playwright_Training_Guide.docx`

## Version Management
- Current version is set in `package.json`.
- Use semantic versioning: MAJOR.MINOR.PATCH.
- Update `CHANGELOG.md` on each change.

## Bug Fixes
- Fixed empty HTML pages by populating `login.html` and `employees.html`.
- Added 404 fallback to avoid silent blank responses.

## Support
For questions or issues, email: neha.jadav@gmail.com

## License
ISC
