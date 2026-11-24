# CaseTrack - Engineering & Development Guidelines
### Architecture Conventions, React 19 Patterns & Vibe-Coding Standards (v2.2.0)

This document establishes the official coding standards, architectural principles, responsive design rules, and QA practices for the **CaseTrack** project.

---

## 1. Core Engineering Principles

### 1.1 Single Source of Truth
- State mutates exclusively through the `CaseTrackContext` provider.
- Components never write directly to `LocalStorage` or mutate local student arrays in place.
- All database read/write operations must go through `StorageService.js` to ensure automatic data normalization, zero-record immunity, and backup mirroring.

### 1.2 Immutability
- Never mutate state objects or arrays directly.
- Always use functional state updates and object/array spread syntax:
  ```javascript
  // Correct:
  setDatabase((prev) => ({
    ...prev,
    students: prev.students.map((s) => (s.id === targetId ? updatedRecord : s))
  }));

  // Incorrect (DO NOT DO THIS):
  // student.status = "case_ready";
  // database.students.push(newStudent);
  ```

### 1.3 Strict Separation of Concerns
- **UI Components** (`src/components/`, `src/pages/`): Responsible purely for rendering, user event capture, and dispatching actions. Never contain hardcoded business rules or calculations.
- **Service Layer** (`src/services/`): Pure JavaScript modules encapsulating business logic, state transitions, validation rules, spreadsheet parsing, and persistence.
- **Utility Layer** (`src/utils/`): Stateless, deterministic helper functions for date formatting, strings, regex, and validation.

---

## 2. React 19 Development Patterns

### 2.1 Context Hook Wrappers
Always access context through custom hook wrappers that enforce presence within their provider tree:
```javascript
import { useCaseTrack } from "../context/CaseTrackContext";
import { useModals } from "../context/ModalContext";
import { useToast } from "../context/ToastContext";
```

### 2.2 Performance & Memoization Guidelines
- Heavy grid tables (`StudentRecordsTable`, `HistoryTable`, `ProgramReportTable`) must be wrapped with `React.memo` to prevent re-renders when unrelated parent state changes.
- Complex filtering or sorting operations inside pages should be wrapped in `useMemo()`:
  ```javascript
  const filteredStudents = useMemo(() => {
    return students.filter(s => matchesFilter(s, searchTerm, stageFilter));
  }, [students, searchTerm, stageFilter]);
  ```

### 2.3 Route Lazy Loading & Code Splitting
- All new page-level views must be code-split using `React.lazy()` and registered inside `src/App.jsx`.
- Heavy external dependencies (e.g. SheetJS `xlsx`) must be configured in `vite.config.js` under `manualChunks` to prevent bloating the initial bundle.

---

## 3. Responsive Design & Layout Rules

### 3.1 13-Viewport Zero-Overflow Guarantee
All views and tables must adapt cleanly without horizontal overflow (`scrollWidth <= innerWidth`) across all 13 supported viewports:
- **Large Desktop**: 1920x1080
- **Desktop HD**: 1600x900
- **Standard Desktop**: 1440x900
- **Small Desktop / Laptop**: 1366x768
- **Compact Laptop**: 1280x800
- **Tablet Landscape / iPad**: 1024x768
- **iPad Air Portrait**: 820x1180
- **Tablet Portrait**: 768x1024
- **Large Mobile (iPhone 14 Pro Max)**: 430x932
- **Standard Mobile (iPhone 12/13/14)**: 390x844
- **Mobile SE (iPhone SE)**: 375x667
- **Galaxy S20**: 360x780
- **Compact Mobile**: 320x568

### 3.2 Responsive Behavior Guidelines
- On viewports `< 992px`, the pure black sidebar collapses into an off-canvas drawer controlled via the header hamburger button and backdrop overlay.
- Wrap data tables inside `.table-responsive` or `.sticky-table-wrapper` with horizontal scroll contained strictly to the table container, never the window.
- Header controls must collapse gracefully: search bar collapses to icon on mobile (`< 768px`), live clock hides on `< 1200px`.

---

## 4. Theme System & UI Consistency

- **Pure Black Sidebar**: Pure black (`#000000`) background with `#1a1a1a` subtle border. Navigation icons and text must remain clean white (`#ffffff`) across both light and dark themes.
- **Brand Purple**: Primary accent buttons, brand badges, and active state highlights must use university purple (`--cui-primary: #5856d6` / `#6f42c1`).
- **Semantic Tokens**: Always use CoreUI 5 CSS tokens (`var(--cui-body-bg)`, `var(--cui-surface-bg)`, `var(--cui-body-color)`, `var(--cui-border-color)`) rather than hardcoded hex colors to ensure seamless light/dark mode compatibility.

---

## 5. Deletion & Safety Conventions

- **Individual Record Deletion**: Always prompt with a dedicated confirmation modal displaying student ID, name, and program.
- **Bulk Record Deletion**: Candidate records must be displayed in a preview table with checkbox toggles and explicit confirmation.
- **Database Purge**: Destructive clearing of all student records must enforce the exact confirmation string `DELETE ALL STUDENT DATA` and automatically trigger an offline JSON safety backup.
- **Backend File Synchronization**: When records are deleted from LocalStorage, always issue REST API calls (`/api/students/cleanup-folders` or `/api/students/clear-all-folders`) to keep the filesystem in sync.

---

## 6. Automated Testing Verification

Before submitting changes, all automated test suites must pass 100%:

```bash
# Run all automated tests
npm run test:all

# Run production build
npm run build
```
