# CaseTrack - Comprehensive Feature Documentation
### User Guide, Feature Specifications & Functional Workflows (v2.2.0)

This document provides exhaustive documentation for all features, screens, modals, and administrative tools available in **CaseTrack**.

---

## 1. Overview & Dashboard (`/dashboard`)

The Dashboard provides high-level operational intelligence for campus administrators.

### 1.1 Stat Widgets (Key Performance Indicators)
The dashboard displays 6 interactive cards reflecting live counts across all workflow stages:
1. **Total Applications**: Total student records registered in the campus database.
2. **Pending Cases**: Applications awaiting document verification and clearance.
3. **Case Ready**: Cleared cases with verified records ready for courier dispatch.
4. **Sent to Main Campus**: Cases dispatched to the main university campus.
5. **Returned Cases**: Cases returned with remarks from the main campus requiring rectification.
6. **Received Cases**: Cases returned with signed degrees/transcripts, permanently completed.

*Clicking any stat card navigates directly to that stage's dedicated table with appropriate filters applied.*

### 1.2 Degree Program Distribution
An aggregate breakdown table displaying student counts across all academic programs (e.g. BSCS, BBA, MBA, MSCS, Software Engineering). Administrators can quickly observe bottlenecks per department across Pending, Ready, Sent, Returned, and Received columns.

### 1.3 Recent Activity Stream
Displays the 10 most recent system events in real-time, detailing the student ID, student name, action taken, timestamp, and responsible operator.

---

## 2. Dedicated Stage-Wise Case Management (`/students/:stage`)

The Student Cases section is separated into 6 dedicated views, providing focused administrative workflows:

```
[All Students]  |  [Pending Cases]  |  [Case Ready]  |  [Sent to Main Campus]  |  [Returned Cases]  |  [Received Cases]
```

### 2.1 View A: All Students (`/students/all`)
- **Purpose**: Master database overview of all student records.
- **Columns**: `S.No`, `Student ID`, `Name`, `Program`, `Apply On`, `Current Status`, `Current Location`, `Actions`.
- **Actions Available**:
  - `View Student`: Opens detailed demographic and full workflow modal.
  - `Edit Student`: Opens student information edit dialog.
  - `Activity History`: Opens per-student event audit trail.
  - `Delete`: Single record deletion with confirmation modal.

### 2.2 View B: Pending Cases (`/students/pending`)
- **Purpose**: Student intake desk and document collection queue.
- **Columns**: `S.No`, `Student ID`, `Name`, `Program`, `Apply On`, `Document Status`, `Actions`.
- **Key Workflow Actions**:
  - **Edit & Upload Documents**: Launches the 4-step Document Management Wizard.
  - **Mark Ready**: Advances the student to Stage 1.
    > [!NOTE]
    > **Optional Document Workflow**: Document uploading is fully optional. An administrator can either upload documents and click Mark Ready, or click Mark Ready directly without uploading documents when verification is managed offline. Both workflows are supported.

### 2.3 View C: Case Ready (`/students/case-ready`)
- **Purpose**: Quality-checked dispatch queue awaiting physical courier delivery to the main campus.
- **Columns**: `S.No`, `Student ID`, `Name`, `Program`, `Apply On`, `Case Ready Date`, `Document Status`, `Actions`.
- **Key Workflow Actions**:
  - **View Documents**: Opens the in-app document viewer to preview the consolidated PDF, download it, or print it.
  - **Send to Main Campus**: Records the dispatch timestamp, generates Attempt #1, and advances the student to Stage 2.

### 2.4 View D: Sent to Main Campus (`/students/sent`)
- **Purpose**: Tracking cases currently in transit or under evaluation at the main university campus.
- **Columns**: `S.No`, `Student ID`, `Name`, `Program`, `Apply On`, `Sent Date`, `Attempt #`, `Actions`.
- **Key Workflow Actions**:
  - **Return Case**: Opens the Return Case dialog to record rejection remarks from the main campus (minimum 5 characters required).
  - **Mark Received**: Confirms that degrees/transcripts have arrived back at the campus, permanently closing the case.

### 2.5 View E: Returned Cases (`/students/returned`)
- **Purpose**: Action items requiring document rectification, missing credits resolution, or fee clearances.
- **Columns**: `S.No`, `Student ID`, `Name`, `Program`, `Apply On`, `Returned Date`, `Return Reason`, `Actions`.
- **Key Workflow Actions**:
  - **Edit & Upload Documents**: Update or re-upload corrected documents.
  - **Resend to Main Campus**: Re-dispatches the case back to the main campus, advancing the attempt counter (e.g. Attempt #2, Attempt #3).

### 2.6 View F: Received Cases (`/students/received`)
- **Purpose**: Completed archive of all finalized student degree cases.
- **Columns**: `S.No`, `Student ID`, `Name`, `Program`, `Apply On`, `Received Date`, `Duration`, `Actions`.
- **Key Workflow Actions**:
  - **View Documents**: Review final consolidated student dossier.
  - **Activity History**: Complete timestamped audit history from intake to completion.

---

## 3. Student Document Management Engine

### 3.1 4-Step Document Upload Wizard
- **Step 1 – Student Information**: Pre-populates Student ID, Name, Program, and Apply On date.
- **Step 2 – Transcripts**: Upload EDP Transcript and Examination Transcript.
- **Step 3 – Academic Documents & Additional Degrees**: Upload Matriculation Certificate, Intermediate Marksheet/Certificate, and add dynamic additional degrees (e.g. B.Com, BA, Post-Graduate diplomas).
- **Step 4 – Review & Submit**: Summary preview of attached files, total file size, and one-click submission.

### 3.2 Automated PDF Consolidation
- Validates uploaded PDFs for MIME type and `%PDF-` binary magic bytes.
- Uses `pdf-lib` to standardize all pages to uniform A4 dimensions (595.28 x 841.89 points).
- Generates `Final_Student_Document.pdf` combining all transcripts and certificates in strict order while preserving original files separately.

---

## 4. Modernized Data Management Center (`/data-management`)

The Data Management page provides a modular 4-card operational interface:

### 4.1 Section A: Excel Upload & Data Ingestion
- Drag-and-drop or file picker supporting `.xlsx` and `.xls` files.
- **Real Odoo Excel Support**:
  - Automatically identifies header row even if preceded by title or blank rows.
  - Splits compound/merged Student ID and Name columns (`IU04-0322-0490 Syeda Yusra Erum`).
  - Supports flexible header synonyms (`Student ID`, `Roll No`, `Date Request`, `Apply Date`, `Program Name`).
  - Handles Excel serial date numbers and ISO strings.
- **Duplicate Collision Handling**: Select between *Skip Existing*, *Update Basic Info*, or *Abort & Report*.
- **Live Preview Grid**: Inspect parsed student rows, valid counts, and duplicate counts before committing to storage.

### 4.2 Section B: Excel Data Export
- Generates a multi-sheet workbook:
  - Sheet 1: `Student Records` (S.No, Student ID, Name, Program, Status, Stage, Dates).
  - Sheet 2: `Workflow History` (Audit trail with actions, timestamps, and operators).

### 4.3 Section C: JSON Database Backup & Restore
- **Download JSON Backup**: Exports complete immutable state snapshot (`casetrack_backup_*.json`).
- **Import / Restore JSON Backup**: Uploads backup file with option to *Completely Replace* or *Merge* with existing database. Schema validation ensures zero data corruption.

### 4.4 Section D: Database Maintenance & Operations
- **Live Database Metrics**: Shows total students, storage bytes, LocalStorage quota, and breakdown by stage.
- **Selective Student Records Deletion**:
  - Filter candidates by Stage or search query.
  - Checkbox selection with *Select All Matching* capability.
  - Confirmation modal before removal.
- **Clear All Student Data (Purge)**:
  - Destructive operation warning modal.
  - Requires typing exact confirmation string: `DELETE ALL STUDENT DATA`.
  - Automatically takes an offline JSON safety backup before execution.
  - Resets student database, dispatches, and backend physical folders while preserving operator name, campus branding, and theme preferences.
- **Factory Reset (Advanced)**:
  - Wipes database, downloads automatic JSON backup, resets settings to default, and purges backend folders.

---

## 5. System Activity History (`/history`)

- Chronological, read-only audit log recording every system action.
- Tracks: Action Name, Timestamp, Operator, Student ID, Student Name, Program, and Description.
- Multi-criteria filtering by Date Range, Student ID, Operator, and Action Type.
- Export audit log to Excel or CSV.

---

## 6. System Settings & Customization (`/settings`)

- **Campus & Branding**: Configure Campus Name (e.g. `by Iqra University`) and Operator Name (e.g. `Admin Officer`).
- **Theme Selection**: Toggle between CoreUI 5 Light Theme and Dark Theme. Both modes preserve the signature pure black sidebar (`#000000`).
- **Storage Diagnostics**: View LocalStorage bytes utilized, record counts, and database schema integrity status.
- **Quick Search**: Global search overlay accessible anytime via `Ctrl + K` or search icon in top header.

---

## 7. Universal Table Width & Responsive Layout Engine

- **Strict Fixed Layout**: Enforces `table-layout: fixed; width: 100% !important;` across all application pages via `GlobalTableLayout.css`.
- **Zero-Overflow Desktop Guarantee**: All tables fit 100% within their parent cards on Large Desktop (1920px), Standard Desktop (1440px), and Laptop (1366px) with 0px horizontal scroll or clipping.
- **Proportional Column Hierarchy**:
  - `S.No`: Fixed 44px, center-aligned.
  - `Student ID`: Fixed 118px, monospaced font, no-wrap.
  - `Student Name`: Flexible 14%-17% with clean word-wrapping preventing awkward truncation.
  - `Program`: Flexible with `.program-badge` multi-line wrapping and theme-aware surface styling.
  - `Apply On / Dates`: Compact 95px-150px timestamp chips.
  - `Actions`: Stage-scoped 95px to 340px with grouped `.table-actions-wrap` and `.table-icon-group` (27x27px icon buttons with tooltips) preventing button clipping or off-screen truncation.
- **Mobile & Tablet Controlled Scroll**: Controlled horizontal scrolling within `.sticky-table-wrapper` / `.table-responsive` without breaking window-level bounds (`document.body.scrollWidth === window.innerWidth`).
- **Full Theme Support**: Automatic color token binding for Light and Dark modes (`var(--cui-surface-subtle)`, `var(--cui-border-color)`, `var(--cui-body-color)`).

---

## 8. Dynamic Application Branding Engine (`/settings`)

- **Dynamic Identity Management**:
  - Customize Application Name (e.g. `CaseTrack`, `CaseTrack Enterprise`).
  - Customize Campus Subtitle (e.g. `by Iqra University`, `Main Campus Registrar`).
  - Institutional Logo Upload: Supports PNG, JPG, JPEG, SVG, and ICO formats up to 5 MB.
- **Dual-Context Live Previews**:
  - Live Sidebar Preview displaying how the brand appears on the pure black sidebar background.
  - Browser Tab Preview displaying real-time title and favicon rendering.
- **Immediate Reactive DOM Injection**:
  - Dynamically updates `<title>` in `document.head`.
  - Dynamically updates `<link rel="icon">` (browser favicon) in `document.head` without full page refresh.
- **State Persistence & Synchronization**:
  - Stored client-side in `database.settings.branding` and server-side in `data/branding.json`.
  - Persists across page refreshes, browser restarts, and server reboots.
  - One-click *Restore Default Branding* button resets branding back to standard Iqra University defaults.

---

## 9. Native Cryptographic Authentication & Security Gateway (`/login`)

- **Enterprise University Sign-In Portal**:
  - University-branded login page reflecting dynamic institution name, subtitle, and custom logo.
  - Interactive password visibility toggle (show/hide).
  - "Remember Me" checkbox providing extended 30-day session tokens vs. standard 24-hour sessions.
  - 1-click test credential pills for seamless verification across all 4 operational roles.
- **Cryptographic Security Standards**:
  - Password hashing implemented via Node.js native `crypto.scryptSync` with 16-byte cryptographically random salt and 64-byte key length.
  - Constant-time verification using `crypto.timingSafeEqual` protecting against timing side-channel attacks.
  - Secure session tokens generated via `crypto.randomBytes(32).toString('hex')` and persisted in `data/sessions.json`.
- **Protected Routing & Session Restoration**:
  - React Router wrapper `ProtectedRoute` guarding all internal views.
  - Seamless session restoration on browser launch via `/api/auth/me`.
  - Graceful `<RouteFallback>` loading spinner preventing flash unauthenticated redirects.

---

## 10. User Management & Role-Based Access Control (RBAC) (`/users`)

- **Operator Directory & Governance**:
  - First-class administrative view situated under **ADMINISTRATION** in the sidebar.
  - Columns: User ID, Full Name, Username, Email, Role, Department, Account Status, Last Login, Actions.
  - Search and filter bar by name, username, email, assigned role, and status.
- **Comprehensive User CRUD**:
  - Create new operator accounts with hashed passwords and assigned department.
  - Edit user names, roles, departments, and active/inactive status.
  - Reset user passwords securely with minimum length validation.
  - Permanent account deletion with automatic termination of active sessions.
- **Strict Security Guardrails**:
  - Self-deletion guard: Prohibits administrators from deleting their own currently logged-in account.
  - Last Super Admin protection: Prevents deletion of the final active Super Admin account.
- **Interactive Role Permissions Matrix**:
  - **Super Admin**: Full unrestricted authority across student cases, documents, backups, system purge, branding, and user management.
  - **Admin Officer**: Student case CRUD, document upload & PDF compilation, dispatch workflows, and Excel ingestion.
  - **Registrar Desk**: Student record review, authorized stage transitions, document preview/printing, and read-only exports.
  - **Auditor (Viewer)**: Read-only access to dashboard and case queues with zero edit, upload, or deletion capabilities.

---

## 11. Universal Table Layout, Collision Prevention & Typography Standards

CaseTrack implements a universal, proportional table layout and typography engine (`GlobalTableLayout.css`) guaranteeing zero element collisions, text clipping, or button overlaps across all device resolutions.

### 11.1 Typography Hierarchy

| Element | Specification | Styling & Font Token |
|---|---|---|
| **Table Headers** | `0.76rem` (~12.2px) | Semibold (`600`), `0.035em` letter spacing, uppercase, `var(--cui-secondary-color)` |
| **Table Body** | `0.835rem` (~13.4px) | Regular (`400`), clean line height, `var(--cui-body-color)` |
| **Student IDs** | `0.8125rem` (13px) | Bold (`700`), `font-monospace`, whitespace nowrap |
| **Program Names** | `0.76rem` (~12.2px) | Medium (`500`), multi-line wrapped badge, `overflow-wrap: break-word` |
| **Status Badges** | `0.72rem` (~11.6px) | Medium (`500`), inline-flex, `0.18rem 0.42rem` padding, theme-tokenized colors |
| **Action Buttons** | `0.71rem` (~11.4px) | Semibold (`600`), `0.20rem 0.38rem` padding, `flex-shrink: 0`, nowrap |
| **Icon Buttons** | `26px × 26px` | Inline-flex centered, `0.76rem` icon size |
| **Timestamp Chips** | `0.72rem` (~11.6px) | Inline-flex, clock/send icon, formatted as `DD-MMM-YYYY HH:MM AM/PM` |

### 11.2 Stage Column Allocation & Zero-Collision Architecture

- **Sent to Main Campus (`stage-table-sent`)**:
  - `col-sent-date` (`160px`): Guarantees full visibility of timestamps (`21-Nov-2026 05:09 PM`) and attempt tags without clipping.
  - `col-status` (`155px`): Displays complete `Sent to Main Campus` badge with icon and padding with zero collision into adjacent cells.
  - `col-actions` (`275px`): Houses `Mark Received` button (`101px`), `Return Case` button (`89px`), and icon action group (`52px`) with a guaranteed positive separation margin of `>= 4px` from status badges.
- **Pending Cases (`stage-table-pending`)**: `col-actions` allocated `325px` for `Edit & Upload Docs`, `Mark Ready`, and utility icons.
- **Case Ready (`stage-table-case-ready`)**: `col-actions` allocated `330px` for `Upload/View Docs`, `Send to Campus`, and document utilities.
- **Returned Cases (`stage-table-returned`)**: `col-actions` allocated `235px` for `Send to Campus` and action icons.
- **Received Cases (`stage-table-received`)**: `col-actions` allocated `95px` for viewing and audit history.
- **All Students (`stage-table-all`)**: `col-actions` allocated `125px` for 4 icon utilities.

### 11.3 Responsive Behavior Across Breakpoints

1. **Desktop & Laptop (1920px, 1440px, 1366px)**:
   - Full 100% container fit (`overflow: 0px`).
   - Academic program and student name columns expand proportionally.
   - Zero horizontal scrollbars required on standard laptop/desktop monitors.
2. **Tablets (1024px, 768px)**:
   - Preserves readable text without squishing columns.
   - Smooth horizontal scrolling cleanly contained within `.sticky-table-wrapper`.
   - Page-level body scrolling strictly prohibited (`bodyOverflow: false`).
3. **Mobile Devices (480px, 375px)**:
   - Contained touch-scrolling within the card table wrapper.
   - All columns and action buttons remain 100% accessible and functional.


