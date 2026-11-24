# 02 - React.js Migration Plan

**Project Name:** CaseTrack - Student Degree & Transcript Workflow Management System  
**Organization:** Iqra University  
**Date:** November 20, 2026  
**Document:** React.js Architecture & Step-by-Step Migration Plan  

---

## 1. Migration Strategy & Core Objectives

The goal is to convert CaseTrack from a Vanilla JavaScript / jQuery application into a high-performance, modular, component-driven **React.js 19 + Vite 8** application while preserving:
1. **100% of existing visual styling & UX design:** The pure black sidebar (`#000000`), purple primary accents (`#6f42c1`), CoreUI 5 table designs, status badges, timestamp chips, and responsive breakpoints.
2. **100% of business logic & workflow integrity:** Sequential 4-stage workflow, mandatory return reasons, resend cycle counters, immutable history logs, and deletion locks on processed records.
3. **100% of data persistence compatibility:** Seamless single-source `localStorage` schema (`casetrack_db_v2`), JSON backup/restore, and multi-sheet Excel import/export.

---

## 2. Target Project Architecture

```text
Degree and Transcript App/
├── public/
│   ├── favicon.ico
│   └── assets/
│       └── images/ (avatars, framework badges, icons)
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Badge.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── MetricBox.jsx
│   │   │   ├── Pagination.jsx
│   │   │   ├── TimestampChip.jsx
│   │   │   └── ToastContainer.jsx
│   │   ├── layout/
│   │   │   ├── AppBreadcrumb.jsx
│   │   │   ├── AppFooter.jsx
│   │   │   ├── AppHeader.jsx
│   │   │   ├── AppLayout.jsx
│   │   │   ├── AppSidebar.jsx
│   │   │   └── StageWorkflowNav.jsx
│   │   ├── modals/
│   │   │   ├── HistoryModal.jsx
│   │   │   ├── QuickSearchModal.jsx
│   │   │   ├── RestoreConfirmModal.jsx
│   │   │   ├── ReturnCaseModal.jsx
│   │   │   ├── StudentFormModal.jsx
│   │   │   ├── ViewStudentModal.jsx
│   │   │   └── WipeConfirmModal.jsx
│   │   └── tables/
│   │       ├── HistoryTable.jsx
│   │       ├── ProgramReportTable.jsx
│   │       └── StudentRecordsTable.jsx
│   ├── context/
│   │   ├── CaseTrackContext.jsx
│   │   └── ToastContext.jsx
│   ├── hooks/
│   │   ├── useLocalStorage.js
│   │   ├── useStudentFilters.js
│   │   ├── useToast.js
│   │   └── useWorkflow.js
│   ├── pages/
│   │   ├── DashboardPage.jsx
│   │   ├── DataManagementPage.jsx
│   │   ├── HistoryPage.jsx
│   │   ├── SettingsPage.jsx
│   │   └── StudentCasesPage.jsx (Handles all 6 dedicated stages)
│   ├── routes/
│   │   └── AppRoutes.jsx
│   ├── services/
│   │   ├── ExcelService.js
│   │   ├── HistoryService.js
│   │   ├── StorageService.js
│   │   └── WorkflowService.js
│   ├── styles/
│   │   ├── index.css
│   │   ├── style.css (Preserved & modularized CoreUI styles)
│   │   └── responsive.css
│   ├── utils/
│   │   ├── dateUtils.js
│   │   ├── formatters.js
│   │   └── validators.js
│   ├── App.jsx
│   └── main.jsx
├── documentation/
│   ├── 01-INITIAL-PROJECT-ANALYSIS.md
│   ├── 02-REACT-MIGRATION-PLAN.md
│   └── ... (All 16 architecture & workflow documents)
├── AI_CONTEXT.md
├── index.html (Vite SPA HTML entry point)
├── package.json
├── vite.config.js
└── README.md
```

---

## 3. Dependency Selection & Justification

| Package | Version | Purpose & Rationale |
| :--- | :--- | :--- |
| `react` & `react-dom` | `^19.0.0` | Core UI engine, functional components, concurrent rendering. |
| `vite` | `^6.0.0` or `^5.4.0` | Ultra-fast development server, HMR, and optimized production bundler. |
| `@vitejs/plugin-react` | `^4.3.0` | Official Vite React plugin supporting JSX/Fast Refresh. |
| `react-router-dom` | `^7.0.0` | Declarative client-side routing, URL synchronization. |
| `xlsx` (SheetJS) | `^0.18.5` | Excel upload parsing, preview generation, and multi-sheet workbook export. |
| `bootstrap-icons` | `^1.11.3` | Comprehensive icon library preserving exact UI visual semantics. |
| `classnames` | `^2.5.1` | Clean dynamic class concatenation for conditional styling. |

*Note: All heavy jQuery DOM dependencies and manual string templating will be completely eliminated.*

---

## 4. Routing Architecture (`react-router-dom`)

The new application provides browser URL routing, allowing users to bookmark, refresh, and navigate directly:

| Route Path | Associated Page | View Mode / Purpose |
| :--- | :--- | :--- |
| `/` | `DashboardPage` | Redirects to `/dashboard` or renders Overview |
| `/dashboard` | `DashboardPage` | Executive Overview, 6 KPI cards, turnaround metrics, recent feed |
| `/students/all` | `StudentCasesPage` | All Student Records (8 columns, no Send/Receive buttons) |
| `/students/pending` | `StudentCasesPage` | Stage 1: Pending Cases Queue (Mark Ready action) |
| `/students/case-ready` | `StudentCasesPage` | Stage 2: Case Ready Queue (Send to Main Campus action) |
| `/students/sent` | `StudentCasesPage` | Stage 3: Sent to Main Campus (Mark Received & Return Case) |
| `/students/returned` | `StudentCasesPage` | Returned Cases Queue (Return Reason + Send Again) |
| `/students/received` | `StudentCasesPage` | Stage 4: Received Cases (Completed degree records) |
| `/history` | `HistoryPage` | Global System Activity Audit Log with search/filter |
| `/data-management` | `DataManagementPage` | Excel Import/Export, JSON Backup/Restore, Wipe Database |
| `/settings` | `SettingsPage` | Campus name, operator name, page size, theme mode, storage meter |
| `*` | `NotFoundPage` | 404 fallback page |

---

## 5. State Management & Data Access Architecture

### 5.1 Centralized Context (`CaseTrackContext`)
Instead of fragmented window globals, state will be orchestrated by `CaseTrackContext`:
* `database`: The reactive in-memory representation of `casetrack_db_v2`.
* `students`: Current list of student records.
* `settings`: Current system settings (`campusName`, `operatorName`, `theme`, `sidebarCollapsed`, `defaultPageSize`).
* `stats`: Dynamically calculated KPI counts, completion rate, turnaround duration, program distribution.
* `notifications`: System notifications queue.
* `refreshData()`: Synchronizes state and triggers re-renders.

### 5.2 Decoupled Services Layer
All business logic is isolated into pure JavaScript services:
1. `StorageService.js`: Direct interface with `localStorage`. Handles validation, serialization, schema migrations, and quota error detection.
2. `WorkflowService.js`: Enforces business rules for status transitions (`markReady`, `sendToMainCampus`, `returnCase`, `markReceived`).
3. `ExcelService.js`: Parses uploaded Excel files, maps flexible column headers, validates row integrity, and exports formatted 8-sheet workbooks.
4. `HistoryService.js`: Maintains tamper-proof global and per-student audit events.

---

## 6. Implementation Phases & Step-by-Step Execution

1. **Step 1: Setup React + Vite Environment**
   - Initialize `package.json` with appropriate scripts and dependencies.
   - Configure `vite.config.js` with React plugin.
   - Stage public assets (images, fonts, icons).

2. **Step 2: Core Styling & Theme Integration**
   - Import `bootstrap-icons`.
   - Adapt `css/style.css` and `css/responsive.css` to `src/styles/` ensuring all design tokens, dark mode selectors, and custom classes are retained.

3. **Step 3: Services & Context Implementation**
   - Implement `StorageService`, `WorkflowService`, `ExcelService`, and `HistoryService`.
   - Implement `CaseTrackContext` and `ToastContext`.

4. **Step 4: Layout & Navigation Components**
   - Build `AppSidebar`, `AppHeader`, `AppBreadcrumb`, and `StageWorkflowNav`.
   - Implement desktop collapse/expand and mobile responsive drawer.
   - Implement light/dark mode toggling.

5. **Step 5: Modals & Interactive Dialogs**
   - Convert all 7 modals into controlled React components with form validation.

6. **Step 6: Pages & Dedicated Stage Tables**
   - Implement `DashboardPage`, `StudentCasesPage` (with stage-specific columns and action rendering), `HistoryPage`, `DataManagementPage`, and `SettingsPage`.

7. **Step 7: Verification & Testing**
   - Run production Vite build (`npm run build`).
   - Execute automated headless browser tests across all workflows.
   - Verify LocalStorage data persistence, Excel import/export, and responsive layouts.

8. **Step 8: Final Documentation & Self-Documenting System**
   - Produce all 16 documentation files, `AI_CONTEXT.md`, and `POST-MIGRATION-AUDIT.md`.
