# CaseTrack - Version History & Changelog
All notable changes to the **CaseTrack** Student Degree & Transcript Workflow Management System are documented in this file.

---

## [2.5.0] - Dynamic Branding, Scrypt Authentication & Enterprise Role-Based Access Control (Current Release)

### Added
- **Dynamic Application Branding & Identity Engine (`src/services/BrandingService.js`, `SettingsPage.jsx`)**:
  - Full configuration interface in **Settings** allowing administrators to customize:
    - Application Name (e.g. `CaseTrack`, `CaseTrack Enterprise`).
    - Campus Subtitle (e.g. `by Iqra University`, `Main Campus`).
    - Institutional Logo / Icon upload supporting PNG, JPG, JPEG, SVG, and ICO formats (up to 5 MB).
  - Real-time multi-context preview boxes (Sidebar appearance & Browser Tab/Title appearance).
  - One-click *Save & Apply*, *Cancel*, and *Restore Default Branding* controls.
  - Reactive, zero-refresh DOM injection updating browser favicon (`<link rel="icon">`) and document title dynamically.
  - Server-side REST endpoints (`GET /api/branding`, `POST /api/branding`, `POST /api/branding/upload-logo`) ensuring branding persists across browser refreshes and server reboots.
- **Enterprise User Management & RBAC System (`src/pages/UserManagementPage.jsx`, `src/pages/UserManagementPage.css`)**:
  - First-class administrative management interface situated under **ADMINISTRATION** in the sidebar.
  - Complete User Directory table with columns: `User ID`, `Full Name`, `Username`, `Email`, `Role Badge`, `Department`, `Account Status`, `Last Login`, and `Actions`.
  - Comprehensive User CRUD:
    - Modal for creating user accounts with initial credentials and department assignments.
    - Modal for editing profile metadata, role assignments, and active/inactive status.
    - Secure password reset modal with minimum length checks and confirmation matching.
    - Protected user deletion modal with strict double-guard safety rules.
  - Strict Security Guards:
    - Self-deletion guard preventing logged-in administrators from deleting their own active account.
    - Last Super Admin protection preventing accidental lockout of administrative authority.
  - Interactive **Role Permissions Matrix** tab detailing authorization across 4 system tiers:
    - *Super Admin*: Full unrestricted access across all modules, user administration, and system configuration.
    - *Admin Officer*: Student case CRUD, document uploads, and workflow execution.
    - *Registrar Desk*: Case inspection, authorized workflow transitions, and view-only document actions.
    - *Auditor (Viewer)*: Strictly read-only access with zero edit or deletion capabilities.
- **Native Cryptographic Authentication & Session Gateway (`src/pages/LoginPage.jsx`, `server/authService.js`)**:
  - University registrar authentication portal (`/login`) with dynamic institutional branding, password visibility toggle, and 1-click test credential pills for seamless verification.
  - Production-grade password hashing utilizing native Node.js `node:crypto.scryptSync` with 16-byte cryptographically random salt and 64-byte key length.
  - Constant-time password verification via `crypto.timingSafeEqual` protecting against timing attacks.
  - Secure token-based session management stored in `data/sessions.json` with 24-hour expiration (or 30-day "Remember Me" extended duration).
  - Session verification endpoint (`GET /api/auth/me`), login endpoint (`POST /api/auth/login`), and logout endpoint (`POST /api/auth/logout`).
  - Protected React router wrapping with `ProtectedRoute`, permission authorization gates (`hasPermission()`), and clean loading fallback states preventing flash redirects.
- **Universal Table Text Wrapping & Multi-Line Integrity (`GlobalTableLayout.css`, `UserManagementPage.css`)**:
  - Enforced `overflow-wrap: break-word;` and `word-break: break-word;` across all table components (`StudentRecordsTable`, `HistoryTable`, `ProgramReportTable`, `DataManagementTable`, and `UserRecordsTable`).
  - Safe wrapping for long student IDs (`col-student-id`, `.student-id-text`) preventing overflow clipping.
  - Multi-line wrapping for long names (`.student-name-text`) with clean 1.25 line height.
  - Natural wrapping for extended degree program titles (`.program-badge`) and return reasons (`.return-reason-box`).
  - Grouped `.table-actions-wrap` ensuring action buttons never clip, overlap, or wrap unintentionally across all screen sizes.

### Verified
- Automated test suite `tests/test-branding-auth-users-tables.mjs` verifying 20 critical assertions with 100% pass rate.
- Full system regression suite (`npm run test:all`) passing all 16 test suites with 0 regressions.
- Complete Vite production build passing in 2.23s with 0 errors.
- Visual verification screenshots captured: `casetrack-login-screen.png`, `casetrack-settings-branding.png`, `casetrack-user-management.png`, `casetrack-rbac-matrix.png`, `casetrack-table-wrapping.png`.

---

## [2.3.0] - Universal Table Width Optimization Across All Pages (Current Release)

### Added
- **Global Table Width & Responsive Layout System (`src/components/tables/GlobalTableLayout.css`)**:
  - Engineered unified, system-wide table layout enforcing strict `table-layout: fixed; width: 100% !important;` across all application pages.
  - Zero-overflow guarantee on all desktop viewports (1920px, 1440px, 1366px) with 100% parent container fit.
  - Standardized column width definitions: S.No (44px), Student ID (118px font-monospace), Student Name (14%-17% with clean word-wrapping), Program (flexible with intelligent multi-line badge wrapping), Dates (95px-150px compact chips).
  - Modern action button architecture with grouped `.table-actions-wrap` and `.table-icon-group` (27x27px icon buttons with tooltips) preventing button clipping or off-screen truncation across all stages.
- **Optimized All Workflow Stages (`StudentRecordsTable.jsx`)**:
  - `All Students`: Standardized 8 columns; Name given 168px; Status (130px) and Location (190px) balanced; Actions grouped into 4-icon toolbar (120px).
  - `Pending Cases`: 7 columns; S.No (44px), Edit & Upload Docs, Mark Ready, and 3 icon buttons (335px) fully visible without clipping.
  - `Case Ready`: 8 columns; reduced blowout from 1670px down to exactly 1120px (0px overflow); primary dispatch button (`Send to Campus`) + dynamic docs action (`View Docs` or `Upload Docs`) + 4-tool icon group.
  - `Sent to Main Campus`: 8 columns; balanced `Mark Received`, `Return Case`, and icon utilities (285px); 0px overflow.
  - `Returned Cases`: 8 columns; bounded return reason callout with word-wrap and tooltip; `Send to Campus Again` button (245px); 0px overflow.
  - `Received Cases`: 9 columns; balanced dispatch and received timestamp chips; 0px overflow.
- **Optimized Supporting Tables**:
  - `HistoryTable.jsx`: Applied `history-data-table table-fixed-layout` with semantic column classes; 0px desktop overflow and controlled scroll inside `.sticky-table-wrapper`.
  - `ProgramReportTable.jsx`: Applied `program-report-data-table table-fixed-layout` with balanced numeric columns; 0px card overflow.
  - `DataManagementPage.jsx`: Section A Excel preview table and Section D Candidate table upgraded to fixed layout with word-wrapping.
  - `DocumentUploadWizardModal.jsx`: Step 4 document summary table upgraded with `table-fixed-layout` and fixed column widths.
- **Automated Verification Suite (`tests/test-all-tables-responsive.mjs`)**:
  - Automated Chrome headless test verifying 9 tables across Large Desktop (1920x1080), Standard Desktop (1440x900), Laptop (1366x768), Tablet (1024x768, 768x1024), and Mobile (430x932).
  - High-resolution visual screenshots saved in `responsive-screenshots/` for both Light and Dark modes.

---

## [2.2.0] - System-Wide Deep Audit, UI Modernization & Deletion Safety

### Added
- **Complete 12-Phase System-Wide Audit**:
  - Full functional audit across all 10 application routes and all 15 student lifecycle steps.
  - Zero-overflow guarantee across 13 device viewports (1920px down to 320px).
  - Complete Light and Dark theme verification with CoreUI 5 design tokens and pure black sidebar (`#000000`) preservation.
- **Modernized Data Management Center (`DataManagementPage.jsx`)**:
  - Redesigned into 4 clean modular sections:
    1. *Section A: Excel Upload & Data Ingestion* (Dropzone, Odoo format support, collision rules, live preview).
    2. *Section B: Excel Data Export* (Multi-sheet workbook generator for Student Records & Workflow History).
    3. *Section C: JSON Database Backup & Restore* (Immutable state snapshots and schema-validated restore).
    4. *Section D: Database Maintenance & Operations* (Live metric cards, selective record deletion, and destructive purge).
  - Page-scoped styles isolated in `src/pages/DataManagementPage.css` ensuring 0% layout interference with other application routes.
- **Robust Multi-Tier Deletion Safety Engine**:
  - **Single Student Deletion**: Confirmation modal dialog displaying target student metadata before removal.
  - **Selected Students Bulk Deletion**: Searchable candidate table with individual checkboxes and *Select All Matching* toggle.
  - **Database Purge**: Destructive operation warning requiring exact confirmation string `DELETE ALL STUDENT DATA`.
  - **Automated Safety Backups**: Automatically triggers and downloads an offline JSON backup (`casetrack_safety_backup_*.json`) before destructive operations.
  - **Safe Backend Folder Synchronization**: Express REST endpoints (`/api/students/cleanup-folders`, `/api/students/clear-all-folders`, `/api/students/:id/documents`) safely remove physical files while preventing root folder deletion.
- **Zero-Record Immunity**:
  - Fixed `ReferenceError: generateId is not defined` in `CaseTrackContext.jsx`.
  - Defensive calculations across Dashboard and Navigation: when student database is empty (`0 records`), all completion rates (`0%`), turnaround metrics (`--`), and program charts render gracefully without NaN or runtime exceptions.
- **Optional Document Upload for Mark Ready Workflow**:
  - Updated `WorkflowService.js` and `StudentCasesPage.jsx` so document uploading is optional.
  - Administrators can mark students Ready with documents (Scenario A) or directly without documents (Scenario B).
- **Advanced Odoo University Excel File Support**:
  - Dynamic header detection capable of identifying the real column row even when preceded by university title/header rows.
  - Automatic splitting of combined Student ID and Name columns (`IU04-0322-0490 Syeda Yusra Erum`).
  - Robust handling of Excel numeric serial dates, ISO dates, and localized date strings.
- **New Automated Test Suites**:
  - `tests/test-system-audit-suite.mjs`: 13-viewport responsive audit and theme verification suite.
  - `tests/test-deletion-operations.mjs`: 13-test suite verifying deletion safety, confirmation strings, and zero-record immunity.
  - `tests/test-data-management-responsive.js`: 9-viewport browser responsive test for Data Management.
  - `tests/test-all-pages-integrity.mjs`: Regression test ensuring all 10 routes render intact.
  - `tests/test-odoo-excel-import.mjs`: Validates actual university Odoo Excel file parsing.
  - `tests/test-optional-document-mark-ready.mjs`: Verifies both documented and undocumented Mark Ready transitions.

---

## [2.0.0] - Production Optimization & Codebase Cleanup

### Added
- **Route Code-Splitting & Lazy Loading**: Converted all top-level routes (`DashboardPage`, `StudentCasesPage`, `DataManagementPage`, `HistoryPage`, `SettingsPage`) to dynamic `React.lazy()` imports with a centered loading fallback in `src/App.jsx`.
- **Component Memoization**: Wrapped high-frequency data grids (`StudentRecordsTable`, `HistoryTable`, `ProgramReportTable`) with `React.memo` to eliminate unnecessary re-renders.
- **Comprehensive Documentation Suite**: Generated full root documentation:
  - `README.md`: Quickstart guide, technology matrix, and project directory structure.
  - `PROJECT_ARCHITECTURE.md`: High-level system architecture, provider hierarchy, and data flow.
  - `FEATURE_DOCUMENTATION.md`: Complete guide for all 6 dedicated stages, modals, and data operations.
  - `DATABASE_AND_DATA_STRUCTURE.md`: Full JSON and TypeScript schemas, validation rules, and file system layouts.
  - `DEVELOPMENT_GUIDELINES.md`: Coding standards, React 19 best practices, and AI-assisted workflow patterns.
  - `CHANGELOG.md`: Detailed release history.
- **Consolidated Test Script**: Added `npm run test:all` script in `package.json` chaining all unit, E2E, and backend tests.

### Changed & Optimized
- **CSS Bundle Optimization**: Removed unused `coreui-icons.min.css` from `src/main.jsx`, eliminating 50+ missing font/SVG build warnings and shrinking CSS bundle size from **459.45 kB down to 397.62 kB** (saving 62 kB).
- **JavaScript Bundle Optimization**: Code-splitting reduced the main application bundle from **379.55 kB down to 316.62 kB**, with isolated chunks for individual pages and SheetJS (`vendor-xlsx`).
- **Dependencies Cleaned**: Removed unused `classnames` package from `package.json`.

### Removed (Legacy Standalone Code)
- Removed obsolete `legacy-vanilla/` directory.
- Removed obsolete unintegrated `theme/` directory.
- Removed legacy root `js/` folder (`app.js`, `crud.js`, `dashboard.js`, `excel.js`, `history.js`, `storage.js`, `utils.js`, `workflow.js`).
- Removed unused legacy `vendor/coreui.bundle.min.js`.
- Removed unused `vendor/coreui-icons.min.css` and `vendor/fonts/`.
- Removed unused template assets from `assets/images/`.

---

## [1.5.0] - Student Document Management & Multi-Step Upload Engine

### Added
- **4-Step Document Upload Wizard (`DocumentUploadWizardModal.jsx`)**:
  - Step 1: Student Information review & update without duplicate creation.
  - Step 2: EDP Transcript and Exam Transcript PDF upload with preview, replace, and remove actions.
  - Step 3: Academic Documents (Matric, Inter Marksheet, Inter Certificate) and dynamic Additional Degrees (+ Add Another Degree).
  - Step 4: Summary checklist and one-click consolidation.
- **Backend Document Storage & PDF Consolidation (`server/documentService.js`)**:
  - Physical file management under `documents/{StudentID}_{StudentName}/`.
  - Multi-part file upload validation with 15MB limit.
  - Magic byte inspection enforcing `%PDF-` header integrity.
  - Automatic `pdf-lib` consolidation: merges all attached documents into a standardized **A4 PDF** (`Final_Student_Document.pdf`).
- **In-App Document Viewer (`ViewDocumentsModal.jsx`)**:
  - High-resolution embedded PDF preview.
  - One-click PDF download and direct browser printing.
