# 14 - Version Changelog

**Application:** CaseTrack - Student Case Management System  
**Organization:** Iqra University  

---

## [2.1.0] - 2026-11-20 (Student Document Management & Multi-Step Upload System)

### Added
- Integrated Node.js & Express persistent local file-storage backend (`server.js`, `server/documentService.js`) with A4 PDF consolidation using `pdf-lib`.
- Automatic student folder structure generation in `documents/{studentId}_{sanitizedName}/` with `transcripts/`, `academic_documents/`, and `Additional_Degrees/` subfolders.
- Full-width 4-Step Document Upload Wizard (`DocumentUploadWizardModal.jsx`) in Pending Cases with progress indicator.
- Mandatory PDF validation for EDP Transcript and Exam Transcript with file preview, replace, and remove capabilities.
- Academic document upload grid supporting PDF, JPG, JPEG, and PNG formats.
- Dynamic "Add Another Degree" functionality supporting multiple additional degrees with custom title separator pages in the merged PDF.
- Document status lifecycle: `Not Uploaded`, `Incomplete`, `Documents Uploaded`, `Submitted`, and `Ready for Processing`.
- Case Ready Queue document actions: View Student, View Documents, Download Complete PDF, Print Documents, and Send to Main Campus.
- Magic byte binary verification for uploaded files preventing spoofed extensions.
- Comprehensive 16-step E2E verification test suite (`tests/test-complete-workflow-e2e.js`) with 100% pass rate.

---

## [2.0.0] - 2026-11-20 (React 19 & Vite 6 Production Migration)

### Added
- Complete React 19 functional component architecture with strict modularity.
- Modern Vite 6 build system with Rollup chunk splitting (`vendor-react`, `vendor-xlsx`).
- React Router 7 client-side hash routing (`HashRouter`) for zero-configuration static hosting.
- Dedicated `CaseTrackContext.jsx`, `ModalContext.jsx`, and `ToastContext.jsx` for clean unidirectional state.
- Automated testing suite with 17 tests (`tests/verify-react-migration.js`) and HTTP static server test (`tests/test-http-server.js`).
- Master AI coding context system (`AI_CONTEXT.md` and `documentation/AI-DEVELOPMENT-WORKFLOW.md`).

### Changed
- Replaced manual DOM string concatenation and fragile innerHTML rendering with declarative JSX templates.
- Replaced global window variables with encapsulated services (`WorkflowService`, `StorageService`, `ExcelService`, `HistoryService`).
- Split Student Cases view into dedicated stage pages: `/students/all`, `/students/pending`, `/students/case-ready`, `/students/sent`, `/students/returned`, `/students/received`.
- Subtitle removed from Data Management header per user specification while preserving header breadcrumbs and action controls.
- Optimized left sidebar with pure black `#000000` styling and white text.

### Preserved
- 100% backward compatibility with `casetrack_db_v2` LocalStorage schema.
- Legacy application code safely archived in `legacy-vanilla/`.

---

## [1.5.0] - 2026-11-19 (CoreUI 5 Theme & Pure Black Sidebar)

### Added
- CoreUI 5 styling integration (`vendor/coreui.min.css`).
- High-contrast pure black sidebar navigation with purple Iqra University branding accents.
- Responsive mobile off-canvas drawer navigation.
- Stage-wise tab filtering and badge counters.

---

## [1.0.0] - 2026-10-15 (Initial Legacy Release)

- Initial prototype using Vanilla JavaScript, jQuery, and SheetJS.
- LocalStorage persistence and Excel upload/download features.
