# 04 - Folder and Project Structure

**Application:** CaseTrack - Student Case Management System  
**Organization:** Iqra University  

---

## 1. Directory Tree

```
Degree and Transcript App/
├── index.html                      # Vite production entry point
├── package.json                    # Project dependencies, scripts & metadata
├── vite.config.js                  # Vite build & chunking configuration
├── AI_CONTEXT.md                   # Master AI reference for future vibe coding
│
├── src/
│   ├── main.jsx                    # Application bootstrapping & provider tree
│   ├── App.jsx                     # React Router 7 route definitions
│   │
│   ├── components/
│   │   ├── common/                 # Reusable atomic UI elements
│   │   │   ├── Badge.jsx           # Status and stage workflow badges
│   │   │   ├── EmptyState.jsx      # Empty table / no data placeholder
│   │   │   ├── Pagination.jsx      # Dynamic pagination controls
│   │   │   └── TimestampChip.jsx   # Formatted timestamp chips
│   │   │
│   │   ├── layout/                 # Application shell & navigation
│   │   │   ├── AppBreadcrumb.jsx   # Live breadcrumb & database status bar
│   │   │   ├── AppHeader.jsx       # Header bar (Clock, Search, Theme, User)
│   │   │   ├── AppLayout.jsx       # Main application wrapper & drawer
│   │   │   ├── AppSidebar.jsx      # Pure black (#000000) sidebar navigation
│   │   │   └── StageWorkflowNav.jsx# Stage workflow tab bar with badge counts
│   │   │
│   │   ├── modals/                 # Dialogs and workflow action modals
│   │   │   ├── HistoryModal.jsx    # Student audit timeline modal
│   │   │   ├── QuickSearchModal.jsx# Global Ctrl+K fast search modal
│   │   │   ├── RestoreConfirmModal.jsx # Database restore warning dialog
│   │   │   ├── ReturnCaseModal.jsx # Main campus return reason modal
│   │   │   ├── StudentFormModal.jsx# Add / Edit student details modal
│   │   │   ├── ViewStudentModal.jsx# Detailed student profile view modal
│   │   │   └── WipeConfirmModal.jsx# Database reset danger modal
│   │   │
│   │   └── tables/                 # Domain-specific data tables
│   │       ├── HistoryTable.jsx    # System activity audit logs table
│   │       ├── ProgramReportTable.jsx # Degree program metrics summary table
│   │       └── StudentRecordsTable.jsx# Stage-specific student records table
│   │
│   ├── context/                    # Centralized React Context state stores
│   │   ├── CaseTrackContext.jsx    # Primary database, students, and settings
│   │   ├── ModalContext.jsx        # Global modal portal and state manager
│   │   └── ToastContext.jsx        # Non-blocking alert notifications queue
│   │
│   ├── pages/                      # Page-level routed views
│   │   ├── DashboardPage.jsx       # Executive KPI metrics, cards & queues
│   │   ├── StudentCasesPage.jsx    # Stage-wise student management page
│   │   ├── HistoryPage.jsx         # Full chronological audit trail page
│   │   ├── DataManagementPage.jsx  # Excel ingestion & JSON backup page
│   │   └── SettingsPage.jsx        # Preferences, theme & storage health page
│   │
│   ├── services/                   # Pure business logic and domain services
│   │   ├── ExcelService.js         # SheetJS parsing, template & multi-sheet
│   │   ├── HistoryService.js       # Event aggregation & badge styling
│   │   ├── StorageService.js       # LocalStorage CRUD, schema & recovery
│   │   └── WorkflowService.js      # 4-stage state machine & transition rules
│   │
│   └── utils/                      # Helper functions and formatters
│       ├── dateUtils.js            # Date formatting, ISO strings & durations
│       ├── formatters.js           # ID generation, HTML escaping & strings
│       └── validators.js           # Student input & return reason validation
│
├── css/                            # Custom styling and CoreUI design tokens
│   ├── style.css                   # Custom styles, pure black sidebar, tables
│   └── responsive.css              # Breakpoints, mobile drawers & typography
│
├── vendor/                         # CoreUI 5 bundled styling & fonts
│   ├── coreui.min.css              # CoreUI 5 CSS framework
│   ├── coreui-icons.min.css        # CoreUI vector iconography
│   └── fonts/                      # Font asset files
│
├── legacy-vanilla/                 # Complete archive of original Vanilla app
│   ├── index.html                  # Legacy HTML entry
│   ├── js/                         # Legacy JS (app.js, storage.js, etc.)
│   └── vendor/                     # Legacy scripts
│
├── tests/                          # Automated verification and test suites
│   ├── test-http-server.js         # Local HTTP static server integration test
│   └── verify-react-migration.js   # Automated unit and workflow test suite
│
├── dist/                           # Production compiled output (Vite build)
│   ├── index.html                  # Optimized index
│   └── assets/                     # Bundled JS, CSS, and web fonts
│
└── documentation/                  # Comprehensive documentation series
    ├── 01-INITIAL-PROJECT-ANALYSIS.md
    ├── 02-REACT-MIGRATION-PLAN.md
    ├── 03-SYSTEM-ARCHITECTURE.md
    ├── 04-FOLDER-STRUCTURE.md
    ├── 05-COMPONENT-DOCUMENTATION.md
    ├── 06-FEATURES-AND-WORKFLOWS.md
    ├── 07-DATA-AND-STATE-MANAGEMENT.md
    ├── 08-DATABASE-AND-STORAGE.md
    ├── 09-ROUTING-AND-NAVIGATION.md
    ├── 10-UI-UX-AND-DESIGN-SYSTEM.md
    ├── 11-VALIDATION-AND-ERROR-HANDLING.md
    ├── 12-TESTING-AND-QA.md
    ├── 13-DEPLOYMENT-GUIDE.md
    ├── 14-CHANGELOG.md
    ├── 15-KNOWN-ISSUES.md
    ├── 16-FUTURE-DEVELOPMENT-GUIDE.md
    ├── AI-DEVELOPMENT-WORKFLOW.md
    ├── FINAL-PROJECT-REPORT.md
    ├── POST-MIGRATION-AUDIT.md
    └── README.md
```

---

## 2. Directory Guidelines for AI & Developers

1. **New UI Components:** Place reusable atomic UI elements in `src/components/common/`. Place domain-specific tables in `src/components/tables/` and full dialogs in `src/components/modals/`.
2. **Business Rules:** Never embed state transition logic directly inside React components. All lifecycle rules must be authored as pure functions in `src/services/WorkflowService.js`.
3. **Data Access:** Never call `window.localStorage` directly from page components. Always use `StorageService.js` through `useCaseTrack()` in `src/context/CaseTrackContext.jsx`.
4. **CSS Modifications:** Global theme variables belong in `css/style.css`. Responsive adjustments belong in `css/responsive.css`. Do not introduce inline styles for structural layouts.
