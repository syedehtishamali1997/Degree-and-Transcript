# 05 - Component Documentation

**Application:** CaseTrack - Student Case Management System  
**Organization:** Iqra University  

---

## 1. Common Components (`src/components/common/`)

### `StatusBadge` & `WorkflowLocationBadge` (`Badge.jsx`)
Renders high-visibility CoreUI status badges with icons matching the 4 workflow stages.

**Props:**
- `status` (string, required): One of `"Pending"`, `"Case Ready"`, `"Sent to Main Campus"`, `"Returned from Main Campus"`, `"Received from Main Campus"`.

**Example:**
```jsx
import { StatusBadge, WorkflowLocationBadge } from "../common/Badge";

<StatusBadge status="Case Ready" />
<WorkflowLocationBadge status={student.status} />
```

---

### `TimestampChip` (`TimestampChip.jsx`)
Formats an ISO timestamp into a badge chip showing formatted date and time with an optional clock icon.

**Props:**
- `timestamp` (string, required): ISO 8601 string or date string.
- `fallback` (string, default: `"--"`): Text to show if timestamp is null or empty.
- `variant` (string, default: `"light"`): Bootstrap background variant.
- `showIcon` (boolean, default: `true`): Whether to prepend a clock icon.

---

### `EmptyState` (`EmptyState.jsx`)
Provides a consistent placeholder illustration and message when lists, tables, or search queries return no records.

**Props:**
- `icon` (string, default: `"bi-inbox"`): Bootstrap icon class name.
- `title` (string, default: `"No Records Found"`): Bold primary heading.
- `message` (string, default: `"No student data available."`): Secondary explanatory text.
- `actionLabel` (string, optional): Button label if action is available.
- `onAction` (function, optional): Callback when action button is clicked.

---

### `Pagination` (`Pagination.jsx`)
Renders accessible pagination controls including previous/next, current range text ("Showing 1 to 25 of 171"), and page numbers with truncation for large datasets.

**Props:**
- `currentPage` (number, required): 1-indexed active page.
- `totalPages` (number, required): Maximum calculated pages.
- `totalItems` (number, required): Total number of items in the dataset.
- `pageSize` (number, required): Records displayed per page.
- `onPageChange` (function, required): Callback with selected page number.

---

## 2. Layout Components (`src/components/layout/`)

### `AppSidebar` (`AppSidebar.jsx`)
The primary navigation sidebar styled in pure black (`#000000`) with white navigation links, purple logo branding, dynamic badge counters per stage, storage meter, and desktop/mobile togglers.

**Props:**
- `isOpen` (boolean): Mobile drawer visibility flag.
- `onCloseMobile` (function): Callback to dismiss mobile drawer.
- `onToggleCollapse` (function): Callback to toggle desktop collapsed rail mode.

---

### `AppHeader` (`AppHeader.jsx`)
Sticky top navigation header providing the mobile hamburger button, global search launcher (Ctrl+K), dynamic route title & subtitle, live ticking clock, notification dropdown with counter badge, theme switcher, and operator identity chip.

**Props:**
- `onOpenMobile` (function): Opens mobile navigation drawer.
- `onToggleCollapse` (function): Toggles desktop sidebar width.
- `onOpenQuickSearch` (function): Triggers the Quick Search modal.

---

### `StageWorkflowNav` (`StageWorkflowNav.jsx`)
The horizontal pill-navigation bar displayed at the top of the Student Cases and Dashboard views. Directly links to `/students/all`, `/students/pending`, `/students/case-ready`, `/students/sent`, `/students/returned`, and `/students/received`, displaying real-time record counts for each stage.

**Props:**
- `currentStage` (string, required): The active stage slug.

---

## 3. Modal Components (`src/components/modals/`)

All modals are managed centrally via `ModalContext.jsx` and mounted inside `AppLayout.jsx`.

| Modal Component | Description & Business Rules | Triggers & Handlers |
| :--- | :--- | :--- |
| **`StudentFormModal.jsx`** | Used for both creating new students and editing existing records. Validates required fields and checks duplicate student IDs. | `openStudentForm(student = null)` |
| **`ViewStudentModal.jsx`** | Read-only modal displaying student profile, degree department, timestamps, dispatch logs, and return reasons. | `openViewStudent(student)` |
| **`ReturnCaseModal.jsx`** | Mandatory dialog when Main Campus returns a case. Enforces minimum 5-character reason input. | `openReturnCase(student)` |
| **`HistoryModal.jsx`** | Chronological timeline view showing every action performed on a specific student record. | `openHistory(student)` |
| **`RestoreConfirmModal.jsx`**| Warning confirmation dialog before replacing or merging JSON database backups. | `openRestoreConfirm(onConfirm)` |
| **`WipeConfirmModal.jsx`** | High-severity red warning modal before clearing the entire database. | `openWipeConfirm(onConfirm)` |
| **`QuickSearchModal.jsx`** | Instant search dialog triggered via `Ctrl+K` with auto-focus and keyboard navigation. | `openQuickSearch()` |

---

## 4. Table Components (`src/components/tables/`)

### `StudentRecordsTable.jsx`
The primary table component for managing student cases. Automatically adapts its rendered columns, headers, and action buttons based on `stageMode`:
- **`all` (All Students):** 8 columns. Displays S.No, Student ID, Name, Program, Apply On, Status, Current Location, and Actions (View, Edit, History, Delete). Action buttons to send or mark received are intentionally hidden here to prevent accidental dispatches.
- **`pending` (Pending Cases):** 7 columns. Displays S.No, Student ID, Name, Program, Apply On, Status, and Actions (View, Mark Ready, Edit, History, Delete).
- **`case-ready` (Case Ready):** 7 columns. Displays S.No, Student ID, Name, Program, Apply On, Case Ready Date, and Actions (View, Send to Main Campus, History).
- **`sent` (Sent to Main Campus):** 8 columns. Displays S.No, Student ID, Name, Program, Apply On, Sent Date, Dispatch Attempt, and Actions (View, Mark Received, Return Case, History).
- **`returned` (Returned Cases):** 8 columns. Displays S.No, Student ID, Name, Program, Apply On, Return Date, Mandatory Return Reason, and Actions (View, Resend to Campus, History).
- **`received` (Completed Cases):** 9 columns. Displays S.No, Student ID, Name, Program, Apply On, Sent Date, Received Date, Status, and Actions (View, History).
