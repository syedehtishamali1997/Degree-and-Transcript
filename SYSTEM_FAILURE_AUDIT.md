# CaseTrack System – Technical Failure Audit & Root Cause Analysis

**Project:** CaseTrack – Student Degree & Transcript Workflow Management System  
**Audit Date:** November 20, 2026  
**Audited By:** Senior Software Architect, React.js Specialist, Full-Stack QA Engineer  
**Status:** **INVESTIGATION COMPLETE & ROOT CAUSES IDENTIFIED**

---

## 1. Executive Summary of System Failures

During live browser testing and deep technical investigation under production and development runtime environments, several critical runtime defects were identified that caused the application to fail to open pages, crash navigation, and render blank screens.

Prior to this investigation, the Vite build was completing with exit code 0 because Rollup does not perform deep runtime reference checking on JSX variables or property existence on imported objects. When evaluated in real browsers (Chrome, Edge, Firefox), uncaught runtime errors were thrown, which in React 19's unhandled exception model caused the entire component tree to unmount, leaving the user with an unresponsive blank screen.

---

## 2. Detailed Root Cause Breakdown

### Failure 1: Uncaught TypeError in `HistoryPage.jsx`
- **Error:** `TypeError: HistoryService.getAll is not a function`
- **Location:** `src/pages/HistoryPage.jsx` (line 20)
- **Root Cause:** `HistoryPage.jsx` attempted to call `HistoryService.getAll(database)`. However, `HistoryService.js` only defined `getAllGlobalEvents(students)`. Calling an undefined function inside a `useMemo` hook during component render threw a fatal runtime exception.
- **Impact:** When a user clicked "Activity History" or navigated to `#/history`, React crashed immediately. Because there was no error boundary, the entire React root unmounted, turning the screen blank and breaking navigation to all subsequent pages.
- **Affected Routes:** `#/history`, and all subsequent routes visited in the session.

### Failure 2: ReferenceError in `DataManagementPage.jsx`
- **Error:** `ReferenceError: totalUploadedDocs is not defined` (and undefined `storageKb`, `cleanupCandidates`, `handleToggleSelectAll`, `handleConfirmDeleteSelected`)
- **Location:** `src/pages/DataManagementPage.jsx` (lines 489–780)
- **Root Cause:** The JSX for the newly introduced "Clean Data from Database" feature referenced metrics (`totalUploadedDocs`, `storageKb`, `cleanupCandidates`, `selectedHistoryCount`, `selectedDocsCount`, `estimatedStorageReleased`) and action handlers that were not declared within the component scope.
- **Impact:** Accessing `#/data-management` threw an uncaught `ReferenceError`, breaking the Data Management view and unmounting the application.
- **Affected Routes:** `#/data-management`.

### Failure 3: Context Method Mismatch in `ToastContext.jsx`
- **Error:** `TypeError: addToast is not a function`
- **Location:** `src/context/ToastContext.jsx` vs. `DataManagementPage.jsx`, `SettingsPage.jsx`, `StudentCasesPage.jsx`, and `HistoryPage.jsx`.
- **Root Cause:** `ToastContext.jsx` only exported `{ showToast, removeToast }` in its provider value. However, 4 major pages consumed `{ addToast } = useToast()`.
- **Impact:** Whenever an action triggered a toast notification (e.g., saving settings, updating a student, changing stage, clearing logs), the component threw an uncaught error and froze UI interactions.

### Failure 4: Disconnected Modal Trigger in `DashboardPage.jsx`
- **Error:** Clicking "Add Student" on the Dashboard failed silently without opening the modal.
- **Location:** `src/pages/DashboardPage.jsx` (lines 9 & 28)
- **Root Cause:** `DashboardPage` declared `({ onOpenAddStudent })` as a component prop and attached `onClick={onOpenAddStudent}`. However, in `src/App.jsx`, `<Route path="/dashboard" element={<DashboardPage />} />` did not pass this prop. The application's modal system is centralized in `ModalContext.jsx` via `openStudentForm(null)`.
- **Impact:** The primary action button on the dashboard was non-functional.

### Failure 5: Windows File Watcher `EBUSY` Crash in Vite Dev Server
- **Error:** `Error: EBUSY: resource busy or locked, watch '...Cookies'` -> `[vite] server connection lost. Polling for restart...` -> `TypeError: Failed to fetch dynamically imported module: .../DashboardPage.jsx`
- **Location:** `vite.config.js` / Node.js v24.21.0 on Windows.
- **Root Cause:** Vite's default file watcher was observing the entire project directory without ignoring temporary browser profile folders, lock files, and document storage directories. When Chrome or backend processes created locked files, Node's `fs.watch` emitted an unhandled `EBUSY` error that crashed the Vite process, immediately dropping client WebSocket connections and preventing dynamic route imports.
- **Impact:** Dev server crashed intermittently, causing dynamic imports to fail and routes to display blank pages.

### Failure 6: Missing Source Map ENOENT in `vendor/coreui.min.css`
- **Error:** `Failed to load source map for vendor/coreui.min.css: ENOENT: no such file or directory, open '...coreui.min.css.map'`
- **Location:** `vendor/coreui.min.css` line 6 (`/*# sourceMappingURL=coreui.min.css.map */`).
- **Root Cause:** CoreUI stylesheet contained a sourcemap comment pointing to a non-existent `.map` file.
- **Impact:** Cluttered dev console and logged 404 warnings on every page reload.

### Failure 7: Complete Absence of React Error Boundaries
- **Error:** Entire application turning into an unrecoverable blank white screen on any component exception.
- **Location:** `src/App.jsx` and `src/components/layout/AppLayout.jsx`.
- **Root Cause:** The application lacked an `ErrorBoundary`. Under React 18/19, any uncaught error in a child component unmounts the entire root if not intercepted by a class-based error boundary.
- **Impact:** Any minor error in a single sub-component caused total catastrophic failure of the entire app.

---

## 3. Summary of Affected Components & Repair Strategy

| Component | Failure Description | Repair Applied |
| :--- | :--- | :--- |
| `src/services/HistoryService.js` | Missing `getAll()` aggregation method | Added polymorphic `getAll(source)` supporting both `database` object and `students` array, merging system logs with student history. |
| `src/pages/DataManagementPage.jsx` | Undefined state variables and handlers | Declared all calculation hooks (`useMemo`), selection handlers, and deletion routines. |
| `src/context/ToastContext.jsx` | Missing `addToast` provider export | Exported `addToast: showToast` alongside `showToast` and `removeToast`. |
| `src/pages/DashboardPage.jsx` | Unbound `onOpenAddStudent` prop | Connected to `useModals()` and invoked `openStudentForm(null)`. |
| `vite.config.js` | File watcher watching locked directories | Added `server.watch.ignored` for `documents/`, `.tmp*`, screenshots, and logs. |
| `vendor/coreui.min.css` | 404 sourcemap comment | Removed dangling `sourceMappingURL` comment. |
| `src/components/common/ErrorBoundary.jsx` | Missing error boundary | Implemented production-grade Error Boundary wrapping both `App.jsx` routes and `AppLayout.jsx` `<Outlet />`. |
