# AI Master Context - CaseTrack (React 19 & Vite 6 SPA)

**Organization:** Iqra University  
**Project:** CaseTrack - Student Case Management System  
**Framework:** React 19, Vite 6, React Router 7, SheetJS (XLSX), Bootstrap Icons, CoreUI 5  
**Primary Storage:** Browser LocalStorage (`casetrack_db_v2`)  

This document serves as the high-density master reference for AI coding agents and LLMs modifying, testing, or extending CaseTrack. Read this document before proposing or applying changes.

---

## 1. Quick File Map

| Path | Purpose | Key Exports / Responsibilities |
| :--- | :--- | :--- |
| `src/main.jsx` | App Bootstrap | Mounts providers: Toast $\to$ CaseTrack $\to$ Modal $\to$ HashRouter $\to$ App |
| `src/App.jsx` | Route Definitions | `/dashboard`, `/students/:stage`, `/history`, `/data-management`, `/settings` |
| `src/components/layout/AppLayout.jsx` | Root Shell | Integrates `AppSidebar`, `AppHeader`, `AppBreadcrumb`, `<Outlet />`, and Footer |
| `src/components/layout/AppSidebar.jsx` | Navigation Bar | Pure black (`#000000`), white links, stage counters, storage gauge, toggler |
| `src/components/layout/AppHeader.jsx` | Header Bar | Hamburger, QuickSearch (Ctrl+K), Clock, Theme toggle, Notifs, User |
| `src/components/layout/StageWorkflowNav.jsx` | Workflow Tabs | Stage pills with dynamic record counters |
| `server.js` | Express Backend | Document API, multer uploads, PDF merging with pdf-lib, static serving |
| `server/documentService.js` | Storage & PDF Engine | Folder creation, magic byte validation, A4 consolidated PDF generation |
| `src/components/modals/DocumentUploadWizardModal.jsx` | 4-Step Wizard | Full-width multi-step upload wizard (Info $\to$ Transcripts $\to$ Academic $\to$ Review) |
| `src/components/modals/ViewDocumentsModal.jsx` | Document Viewer | Side-by-side viewer for individual files, download, and clean printing |
| `src/components/tables/StudentRecordsTable.jsx`| Dynamic Table | Renders stage-specific columns, Document Status, and document action controls |
| `src/context/CaseTrackContext.jsx` | Primary Store | `students`, `database`, `settings`, `stats`, `addStudent`, `updateStudentDocuments`, etc. |
| `src/context/ModalContext.jsx` | Modal Manager | `openStudentForm`, `openViewStudent`, `openReturnCase`, `openHistory`, etc. |
| `src/context/ToastContext.jsx` | Toast Alerts | `addToast(msg, variant)` |
| `src/services/WorkflowService.js` | State Machine | 4-stage transitions, mandatory return reasons, resend logic, deletion locks |
| `src/services/StorageService.js` | Persistence | LocalStorage CRUD (`casetrack_db_v2`), schema normalization, recovery |
| `src/services/ExcelService.js` | Spreadsheet | SheetJS import with Odoo combined Student columns, dynamic header search, serial dates & 7-sheet export |
| `src/services/HistoryService.js` | Audit Log | Global chronological event aggregation |
| `src/utils/dateUtils.js` | Dates & Times | `formatDateOnly`, `formatTimestamp`, `formatDurationHours`, `nowLocalISO` |
| `src/utils/validators.js` | Validation | Form validation and return reason constraints ($\ge 5$ chars) |
| `css/style.css` | Design Tokens | Pure black sidebar, purple brand tokens (`#6f42c1`), table layouts |
| `css/responsive.css` | Breakpoints | Off-canvas drawer, responsive typography, media queries |
| `tests/verify-react-migration.js` | Unit & Workflow | 17 automated tests verifying state transitions, storage, and validation |

---

## 2. Business Rules & State Machine

The sequential workflow consists of 4 strict stages:
$$\text{Pending (Stage 0)} \xrightarrow{\text{Mark Ready}} \text{Case Ready (Stage 1)} \xrightarrow{\text{Send}} \text{Sent to Main Campus (Stage 2)} \underset{\text{Resend}}{\overset{\text{Return}}{\rightleftharpoons}} \text{Returned Case} \xrightarrow{\text{Receive}} \text{Received (Stage 3)}$$

1. **Pending Cases:** Active unprocessed requests. Can be edited or deleted. **Document upload is optional** for transitioning to Stage 1 (*Mark Ready* is enabled with or without uploaded files).
2. **Case Ready:** Verification complete. Once marked ready, records are **permanently locked against deletion** to preserve audit safety. Administrators may upload or update clearance documents at any time.
3. **Sent to Main Campus:** Dispatched records. Tracks dispatch attempts (`attemptNo`).
4. **Returned Cases:** Cases returned by Main Campus. **Mandatory return reason of $\ge 5$ characters**. Resending advances attempt counter (Attempt #2+) and retains return logs.
5. **Received Cases:** Case successfully returned and degree issued. Permanently locked.

---

## 3. Storage Specification

- **Primary Storage Key:** `casetrack_db_v2` in `window.localStorage`.
- **Mirrored Recovery Key:** `casetrack_db_v2_last_valid_backup`.
- **Database Object Schema:**
  ```json
  {
    "version": "2.0.0",
    "lastUpdated": "2026-11-20T12:00:00.000Z",
    "settings": {
      "campusName": "by Iqra University",
      "operatorName": "Admin Officer",
      "pageSize": 25,
      "theme": "light",
      "sidebarCollapsed": false
    },
    "students": [],
    "history": [],
    "notifications": []
  }
  ```

---

## 4. UI/UX Rules & Styling Tokens

1. **Sidebar:** Pure black (`#000000`). All navigation link texts and icons are pure white (`#ffffff`). Section headers use light grey (`#9ca3af`). Active items use white text on `rgba(255, 255, 255, 0.14)`.
2. **University Brand Color:** Primary purple is `#6f42c1` (`--cui-primary`).
3. **Data Management Header:** Subtitle is intentionally empty string (`""`) per user requirement. Do not add default subtitles back to `/data-management`.
4. **Tables:** All tables must be wrapped in `.table-responsive` with sticky column headers and stage-specific actions.

---

## 5. Development & Testing Commands

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Run automated unit and workflow test suite (17 tests)
node tests/verify-react-migration.js

# Compile production build
npm run build

# Run local HTTP server test
node tests/test-http-server.js
```
