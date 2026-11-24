# 09 - Routing and Navigation

**Application:** CaseTrack - Student Case Management System  
**Organization:** Iqra University  

---

## 1. Route Table & Navigation Map

CaseTrack utilizes **React Router 7** with `HashRouter` to provide immediate client-side navigation without server rewrite dependencies.

| Route Path | View / Component | Page Title in Header | Description |
| :--- | :--- | :--- | :--- |
| `#/` | Redirect to `#/dashboard` | -- | Default application entry redirect |
| `#/dashboard` | `DashboardPage.jsx` | Administrative Dashboard | High-level KPI metrics, stage summary cards & program reports |
| `#/students` | Redirect to `#/students/all` | -- | Default student records redirect |
| `#/students/all` | `StudentCasesPage.jsx` (`stage="all"`) | All Student Records | Complete directory of all student records across all stages |
| `#/students/pending` | `StudentCasesPage.jsx` (`stage="pending"`) | Pending Cases | Active Stage 0 cases awaiting verification |
| `#/students/case-ready`| `StudentCasesPage.jsx` (`stage="case-ready"`) | Case Ready Queue | Stage 1 cases packaged and ready for campus dispatch |
| `#/students/sent` | `StudentCasesPage.jsx` (`stage="sent"`) | Sent to Main Campus | Stage 2 active dispatches awaiting receipt or return |
| `#/students/returned`| `StudentCasesPage.jsx` (`stage="returned"`) | Returned Cases | Cases returned with mandatory reasons, ready for resend |
| `#/students/received`| `StudentCasesPage.jsx` (`stage="received"`) | Completed / Received Cases| Stage 3 permanently completed records (degrees issued) |
| `#/history` | `HistoryPage.jsx` | System Activity History | Chronological system-wide audit trail |
| `#/data-management` | `DataManagementPage.jsx` | Data Management | Excel spreadsheet upload, multi-sheet export, JSON backups |
| `#/settings` | `SettingsPage.jsx` | System Settings | Preferences, operator name, theme, and storage diagnostics |
| `*` | Redirect to `#/dashboard` | -- | Catch-all fallback route |

---

## 2. Navigation Synchronization

1. **Active Route Highlighting:** `AppSidebar.jsx` inspects `location.pathname` and dynamically applies the `.active` CSS class to the corresponding navigation link.
2. **Dynamic Header & Breadcrumb Updates:** `AppHeader.jsx` and `AppBreadcrumb.jsx` map the active route path to specific header titles and breadcrumbs without manual per-page overrides.
3. **Stage Workflow Navigation (`StageWorkflowNav.jsx`):** Synchronizes tab selection with `/students/:stage`, providing instant visual count badges for every queue.

---

## 3. Keyboard Shortcuts & Fast Access

- **`Ctrl + K` / `Cmd + K`:** Triggers the global Quick Search dialog from any screen, allowing operators to instantly locate students by ID or name without leaving their active page.
- **Escape Key:** Dismisses open modals and resets search queries.
- **Mobile Drawer Auto-Close:** Navigating to any route automatically collapses the mobile navigation drawer.
