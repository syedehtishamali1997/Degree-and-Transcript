# AI Development Workflow & Vibe Coding Guidelines

**Application:** CaseTrack - Student Case Management System  
**Organization:** Iqra University  
**Target Audience:** Future AI Coding Agents, LLM Developers & Software Engineers  

---

## 1. Core Principles for AI-Assisted Development

CaseTrack was built with a **self-documenting, AI-first architecture**. Any AI tool or developer working on this codebase must adhere to the following core tenets:

1. **Verify Before and After:** Never assume a modification works without building the project (`npm run build`) and running the automated test suite (`node tests/verify-react-migration.js`).
2. **Never Weaken Assertions:** If a test fails after making changes, fix the underlying logic rather than modifying or weakening test assertions.
3. **Respect Layer Boundaries:**
   - UI components (`src/components/`, `src/pages/`) handle rendering and user interactions only.
   - Business state transitions belong exclusively in `src/services/WorkflowService.js`.
   - Data persistence belongs exclusively in `src/services/StorageService.js`.
   - Context providers (`src/context/`) wire services to UI components.
4. **Preserve Single Source of Truth:** Do not write directly to `window.localStorage` inside UI components. Always use `StorageService.saveDatabase()` via the `CaseTrackContext` dispatcher.

---

## 2. Natural-Language Command System Specification

Future AI coding assistants can interpret user natural language commands and map them directly to codebase modifications using this specification:

### Command Mapping Reference

| User Natural Language Prompt | Target Files | Recommended AI Action |
| :--- | :--- | :--- |
| *"Add a new field called 'CNIC' to students"* | 1. `src/services/StorageService.js`<br>2. `src/components/modals/StudentFormModal.jsx`<br>3. `src/components/modals/ViewStudentModal.jsx`<br>4. `src/components/tables/StudentRecordsTable.jsx`<br>5. `tests/verify-react-migration.js` | 1. Add `cnic: String(s.cnic \|\| "")` in `normalizeStudentRecord`.<br>2. Add CNIC input field in `StudentFormModal`.<br>3. Add CNIC row in `ViewStudentModal`.<br>4. Re-run tests and compile build. |
| *"Require minimum 10 characters for return reasons"* | 1. `src/services/WorkflowService.js`<br>2. `src/utils/validators.js`<br>3. `src/components/modals/ReturnCaseModal.jsx`<br>4. `tests/verify-react-migration.js` | Update check from `str.length < 5` to `str.length < 10`. Update modal helper text and test assertions. |
| *"Change primary brand color from purple to navy"* | 1. `css/style.css`<br>2. `src/components/layout/AppSidebar.jsx` | Update `--cui-primary` hex value in `css/style.css` from `#6f42c1` to desired navy hex (e.g., `#0f2b5c`). |
| *"Add a new stage called 'Dean Approval'"* | 1. `src/services/WorkflowService.js`<br>2. `src/components/common/Badge.jsx`<br>3. `src/components/layout/StageWorkflowNav.jsx`<br>4. `src/components/tables/StudentRecordsTable.jsx` | Follow Recipe B in `documentation/16-FUTURE-DEVELOPMENT-GUIDE.md`. |
| *"Add an option to export as PDF"* | 1. `package.json` (add `jspdf`)<br>2. `src/services/PdfService.js` (create)<br>3. `src/pages/DataManagementPage.jsx` | Implement PDF generation using table metrics and provide download trigger button. |

---

## 3. Pre-Commit Checklist for AI Agents

Before declaring any task or feature complete, an AI agent **MUST**:

- [ ] Run `npm run build` and ensure exit code 0 with zero syntax errors.
- [ ] Run `node tests/verify-react-migration.js` and ensure 100% test pass (exit code 0).
- [ ] Verify that LocalStorage schema compatibility (`casetrack_db_v2`) is preserved.
- [ ] Ensure that UI styling preserves the pure black sidebar (`#000000`), white navigation text, and purple branding.
- [ ] Update documentation and changelog if adding or altering public APIs.
