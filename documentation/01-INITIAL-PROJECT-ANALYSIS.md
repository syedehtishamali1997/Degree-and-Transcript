# 01 - Initial Project Analysis

**Project Name:** CaseTrack - Student Degree & Transcript Workflow Management System  
**Organization:** Iqra University  
**Audit Date:** November 20, 2026  
**Auditor:** Senior Software Architect & Code Auditor  
**Phase:** Phase 1 - Complete Existing Project Deep Analysis  

---

## 1. Executive Summary

CaseTrack is a specialized single-page web application designed for campus registrar desks to manage, track, dispatch, and audit student degree and transcript applications. The application enforces a strict 4-stage sequential workflow between the local campus intake desk and the university's Main Campus.

Prior to migration, the application is implemented as an HTML5/CSS3/Vanilla JavaScript single-page application (SPA) with jQuery 3.7.1, CoreUI 5/Bootstrap 5 CSS, Bootstrap Icons, and SheetJS (XLSX). Data persistence is handled via a single-source JSON document stored in browser `localStorage`.

This document establishes the baseline architecture, inventory, functional audit, and technical debt analysis required for migrating the application to a modern, component-driven **React.js + Vite** architecture.

---

## 2. Technology Stack & Dependencies Inventory

| Category | Existing Technology | Version / Source | Migration Target in React |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | Vanilla JavaScript (ES6+ IIFEs) | Native Browser | React.js 19 (Functional Components + Hooks) |
| **Build Tool / Bundler** | None (Static files served directly) | N/A | Vite 8+ |
| **DOM / Event Library** | jQuery | 3.7.1 (CDN / Vendor) | React Virtual DOM, State, Synthetic Events |
| **Design System / CSS** | CoreUI 5 / Bootstrap 5 / Custom CSS | `css/style.css`, `css/responsive.css` | SCSS Modules / CoreUI React (`@coreui/react 5.13+`) |
| **Iconography** | Bootstrap Icons + CoreUI Icons Free | 1.11.3 (CDN) + Vendor Fonts | `@coreui/icons-react` & `bootstrap-icons` |
| **Spreadsheet Engine** | SheetJS (XLSX) | 0.18.5 (CDN) | `xlsx` npm package |
| **Persistence Layer** | Browser `localStorage` | Key: `casetrack_db_v2` | Centralized `StorageService` with React Context |
| **Navigation** | Hashless Custom State Navigator (`App.navigateTo`) | In-memory `currentSection` | `react-router-dom` (v7) |
| **Modals / Dialogs** | Bootstrap 5 Modals via DOM IDs & jQuery | Native BS5 / CoreUI JS | React Modal Components (`CModal`, `CModalBody`) |

---

## 3. Complete File & Directory Structure

```text
Degree and Transcript App/
├── assets/
│   ├── images/
│   │   ├── avatars/ (1.jpg - 9.jpg)
│   │   ├── angular.jpg, react.jpg, vue.jpg, components.webp, icons.webp
├── css/
│   ├── style.css (1,570 lines - CoreUI 5 tokens, dark mode, custom table & workflow styling)
│   └── responsive.css (111 lines - Breakpoint rules for 992px, 576px, and 390px)
├── js/
│   ├── app.js (833 lines - Main controller, routing, event binding, live clock, dark mode)
│   ├── crud.js (165 lines - Student create/edit modal form logic, validation, duplicate check)
│   ├── dashboard.js (625 lines - Stats calculation, program table, stage-wise table rendering)
│   ├── excel.js (310 lines - SheetJS parsing, template generator, multi-sheet workbook export)
│   ├── history.js (215 lines - Audit logging, student detail modal, history timeline modal)
│   ├── storage.js (384 lines - LocalStorage schema, normalization, backup/restore, quota check)
│   ├── utils.js (180 lines - Date parsing, formatting, sanitization, toast alerts)
│   └── workflow.js (284 lines - Finite state machine, transition guards, attempt tracking)
├── vendor/
│   ├── coreui.min.css
│   ├── coreui.bundle.min.js
│   ├── coreui-icons.min.css
│   └── fonts/ (CoreUI-Icons-Free.ttf, CoreUI-Icons-Free.woff2)
├── theme/ (Provided reference CoreUI React 5.7 admin template)
├── index.html (1,251 lines - Single-page shell with 5 sections and 7 modals)
├── favicon.ico
└── README.md
```

---

## 4. Page & Section Inventory

The application operates as a single-page interface with 5 primary sections and 6 dedicated student case views:

### 4.1 Section 1: Administrative Dashboard (`#section-dashboard`)
* **Live KPI Widget Cards (6):** Total Cases, Pending Cases, Case Ready, Sent to Main Campus, Returned Cases, Received Cases. Each card is interactive and filters the case directory on click.
* **Turnaround & Efficiency Metrics (3):** Completion Rate (`%`), Average Turnaround Time (`hours/days`), Total Returns Logged.
* **Program Distribution Breakdown:** Tabular breakdown of records grouped by degree program (`BSCS`, `BBA`, `BSSE`, `MBA`, etc.) showing stage distribution per program.
* **Live Activity Feed:** Chronological stream of the 10 most recent lifecycle events with color-coded status badges and relative timestamps.

### 4.2 Section 2: Student Case Management (`#section-records`)
Features a 6-stage view switcher accessible through both the dark sidebar and horizontal pill tabs (`#stageWorkflowNav`):

| View Key | Title & Badge | Columns Rendered | Stage-Specific Actions |
| :--- | :--- | :--- | :--- |
| `all-students` | **All Student Records** *(Complete Database)* | S.No, Student ID, Name, Program, Apply On, Status, Location Badge, Actions | View, Edit, History, Delete (Pending only) |
| `pending` | **Pending Cases Queue** *(Stage 1: Awaiting Case Ready)* | S.No, Student ID, Name, Program, Apply On, Status, Actions | **Mark Ready**, View, Edit, History, Delete |
| `case-ready` | **Case Ready Queue** *(Stage 2: Ready for Dispatch)* | S.No, Student ID, Name, Program, Apply On, Case Ready Date, Actions | **Send to Main Campus**, View, History |
| `sent` | **Sent to Main Campus** *(Stage 3: Dispatched)* | S.No, Student ID, Name, Program, Apply On, Sent Date (#Attempt), Status, Actions | **Mark Received**, **Return Case**, View, History |
| `returned` | **Returned Cases Queue** *(Action Required)* | S.No, Student ID, Name, Program, Apply On, Returned Date (#Return), Return Reason, Actions | **Send Again**, View, History |
| `received` | **Completed Cases** *(Stage 4: Degree Issued)* | S.No, Student ID, Name, Program, Apply On, Sent Date, Received Date, Status, Actions | View, History (Read-only) |

* **Filter Bar:** Global keyword search, Student ID match, Student Name match, Program dropdown, Status lock/filter, Date field selector (`Apply On`, `Case Ready`, `Sent At`, `Returned At`, `Received At`), Date From/To pickers, Reset button.
* **Pagination & Page Size:** Configurable rows per page (`5`, `10`, `25`, `50`, `100`), dynamic pagination links.

### 4.3 Section 3: System Activity History (`#section-activity-history`)
* Complete audit trail of every database mutation with timestamp, student ID, student name, operator, action category, and notes.
* Real-time search filter and action category dropdown.

### 4.4 Section 4: Data Management & Persistence (`#section-data-management`)
* **Excel Upload & Parse:** Drag-and-drop or file select (`.xlsx`, `.xls`). Interactive preview table with client-side schema validation and duplicate ID policy selection (`Skip Duplicates` vs `Overwrite Existing`).
* **Excel Multi-Sheet Export:** Generates formatted `.xlsx` workbook with sheets for *Summary*, *All Students*, *Pending*, *Case Ready*, *Sent*, *Returned*, *Received*, and *Workflow Audit Log*.
* **JSON Backup & Restore:** Complete JSON database export (`casetrack_backup_YYYY-MM-DD.json`), JSON restore with schema validation and merge options (`Merge Non-Duplicates` vs `Full Database Replacement`). Safety backup downloaded automatically before overwrite.
* **Database Reset:** Destructive wipe requiring explicit confirmation.

### 4.5 Section 5: System Settings (`#section-settings`)
* General settings: Campus Name, Operator Name, Default Records per Page.
* Theme toggle: Light / Dark Mode selector.
* Storage Health: Live LocalStorage consumption gauge (`KB / ~5,120 KB` and `%` bar).
* Diagnostics: Notification clear tool and System Diagnostic JSON export bundle.

---

## 5. Modal Inventory

| Modal ID | Purpose | Trigger / Invocation | Form Fields & Controls |
| :--- | :--- | :--- | :--- |
| `#studentFormModal` | Add / Edit Student Record | "Add Student" buttons, row Edit button | Student ID, Name, Program (with datalist suggestions), Apply On date. Workflow timestamps are locked. |
| `#viewStudentModal` | Comprehensive Student Diagnostic | Row View button | Full profile, lifecycle stage tracker, timestamp cards, approved departments, quick button to full history. |
| `#returnCaseModal` | Main Campus Return Dialog | Row "Return Case" button | Mandatory Return Reason textarea (validated: >= 5 chars, non-whitespace). Previous sent date display. |
| `#historyModal` | Student Timeline Log | Row History button, View modal | Vertical timeline visualization of all recorded actions for the student. |
| `#restoreConfirmModal` | JSON Restore Confirmation | JSON File input on Data Management | Modal offering "Merge Without Overwrite" vs "Full Replace (Auto-Backup First)". |
| `#wipeConfirmModal` | Database Wipe Guard | "Clear All Database Records" button | Two-step confirmation dialog with explicit warning. |
| `#quickSearchModal` | Global Command Palette | `Ctrl+K` / `Cmd+K` / Header search button | Instant fuzzy search across student IDs, names, programs, and return reasons. |

---

## 6. Business Logic & Workflow Engine Analysis

### 6.1 State Machine Specification
```
[Pending] 
   │  (markCaseReady)
   ▼
[Case Ready] 
   │  (sendToMainCampus: Attempt #1)
   ▼
[Sent to Main Campus] ────────────┐
   │                              │ (returnCase: requires reason)
   │                              ▼
   │                      [Returned from Main Campus]
   │                              │
   │  (markReceived)              │ (sendToMainCampus: Attempt #2+)
   │                              ▼
   └─────────────────────> [Sent to Main Campus]
                                  │
                                  ▼ (markReceived)
                          [Received from Main Campus] (FINAL / LOCKED)
```

### 6.2 Business Rules Enforced
1. **Uniqueness:** Student ID is case-insensitively unique across the entire database.
2. **Irreversibility of Case Ready:** Once marked `Case Ready`, the timestamp is permanently locked.
3. **Mandatory Return Reason:** A case cannot be marked returned without an explicit explanation (minimum 5 non-whitespace characters).
4. **Resend Cycles:** Resending increments the dispatch counter (`#1`, `#2`, etc.) and appends to `sendHistory` while preserving previous send and return timestamps.
5. **Deletion Restrictions:** Processed cases (`Case Ready`, `Sent`, `Returned`, `Received`) **cannot be deleted**. Only `Pending` cases may be deleted.
6. **Completion Lock:** `Received from Main Campus` cases are final. No further status changes or returns are permitted.

---

## 7. Data Storage & Schema Analysis

The application stores all data in a single JSON structure under `localStorage.getItem("casetrack_db_v2")`:

```json
{
  "version": "2.0.0",
  "lastUpdated": "2026-11-20T12:00:00.000Z",
  "settings": {
    "campusName": "by Iqra University",
    "operatorName": "Admin Officer",
    "defaultPageSize": 25,
    "theme": "light",
    "sidebarCollapsed": false
  },
  "students": [
    {
      "id": "std-9f8a2b1c",
      "serialNumber": 1,
      "studentId": "IU04-0122-001",
      "name": "Ayesha Khan",
      "program": "BSCS",
      "programFull": "Bachelor of Science in Computer Science",
      "approvedDepartments": "Accounts, Library, Registrar",
      "applyOn": "2026-11-01",
      "status": "Pending",
      "caseReady": null,
      "sendHistory": [
        {
          "sentAt": "2026-11-06T11:00:00.000Z",
          "operator": "Admin Officer",
          "notes": "Sent to Main Campus",
          "returnedAt": "2026-11-08T15:30:00.000Z",
          "returnReason": "Missing intermediate marksheet"
        }
      ],
      "received": null,
      "activityHistory": [
        {
          "action": "Record Created",
          "timestamp": "2026-11-01T09:00:00.000Z",
          "description": "Student record registered."
        }
      ],
      "createdAt": "2026-11-01T09:00:00.000Z",
      "updatedAt": "2026-11-08T15:30:00.000Z"
    }
  ],
  "history": [],
  "notifications": []
}
```

---

## 8. Identified Issues & Technical Debt in Existing Codebase

1. **Monolithic DOM Scripting:** Over 2,500 lines of Vanilla JavaScript with extensive jQuery DOM manipulation, making state synchronization fragile and prone to timing mismatches.
2. **Global Namespace Pollution:** Multiple window globals (`window.App`, `window.StorageManager`, `window.WorkflowEngine`, `window.DashboardManager`, `window.HistoryManager`, `window.ExcelManager`, `window.CrudManager`, `window.Utils`).
3. **Fragile Modal Lifecycle:** Modal state depends on Bootstrap/CoreUI jQuery plugins interacting with manual backdrop and body classes, occasionally leaving stuck backdrops if transitions conflict.
4. **Lack of URL Routing:** Switching views updates an in-memory variable `currentSection`. Reloading the browser always returns to `dashboard` rather than preserving the user's active page.
5. **No Static Type Checking or Component Boundaries:** HTML strings are concatenated in JavaScript (e.g. `getTableHeadHtml`, `renderRowForMode`), making maintenance error-prone.
6. **No Automated Build Pipeline:** Dependencies are loaded via external CDN links and unbundled vendor files, with no code splitting, minification, or tree shaking.

---

## 9. Migration Requirements & Recommendations

1. **Adopt Vite + React.js 19:** Set up modern React with functional components, React Hooks (`useState`, `useMemo`, `useCallback`, `useContext`, `useEffect`), and Vite for fast HMR and optimized production builds.
2. **Implement React Router v7:** Provide real browser URL routing (`/dashboard`, `/students/all`, `/students/pending`, `/students/case-ready`, `/students/sent`, `/students/returned`, `/students/received`, `/history`, `/data-management`, `/settings`).
3. **Encapsulate Data in React Context / Custom Hooks:** Create `CaseTrackContext` and custom hooks (`useStudents`, `useWorkflow`, `useSettings`, `useStorage`) to provide reactive state across all components without manual DOM updates.
4. **Modular Component Architecture:**
   - Common UI: Button, Badge, TimestampChip, Card, MetricBox, EmptyState, Toast
   - Layout: Sidebar, Header, Breadcrumbs, Footer
   - Forms: StudentFormModal, ReturnCaseModal, QuickSearchModal, RestoreModal
   - Tables: StudentTable (with stage-specific columns), ProgramReportTable, HistoryTable
5. **Preserve Exact UI/UX & Data Integrity:** Maintain the CoreUI 5 theme, pure black dark sidebar, responsive layouts, LocalStorage schema, and Excel/JSON import-export capabilities.
6. **Self-Documenting Architecture:** Generate complete documentation suite for future AI development sessions.
