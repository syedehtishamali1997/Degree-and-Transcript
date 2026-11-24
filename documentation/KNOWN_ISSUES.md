# CaseTrack System – Known Issues, Operational Boundaries & Technical Notes
### Engineering Boundaries, Resolved Defects & Operational Recommendations (v2.2.0)

**Project:** CaseTrack – Student Degree & Transcript Workflow Management System  
**Version:** 2.2.0 Production  
**Status:** **ACTIVE REFERENCE DOCUMENT**

---

## 1. Recently Resolved Defects & Optimizations

The following critical issues were diagnosed, repaired, and verified:
1. **ReferenceError: generateId is not defined in CaseTrackContext.jsx**:
   - *Symptom*: Purging all student records or performing bulk student deletion crashed the application with a blank page.
   - *Fix*: Imported `generateId` from `../utils/formatters` in `CaseTrackContext.jsx`.
2. **Missing Single-Student Deletion Confirmation Modal**:
   - *Symptom*: Deleting an individual student lacked an explicit confirmation modal.
   - *Fix*: Created `DeleteConfirmationModal.jsx` and integrated with `ModalContext.jsx`.
3. **Orphan Backend Folders on Student Deletion**:
   - *Symptom*: Deleting students from LocalStorage left empty or orphaned folders in `documents/`.
   - *Fix*: Implemented `/api/students/cleanup-folders` and `/api/students/clear-all-folders` endpoints with path traversal safety.
4. **Mandatory Document Upload Block in Mark Ready**:
   - *Symptom*: The system blocked marking students Ready if no documents were uploaded.
   - *Fix*: Updated `WorkflowService.js` and `StudentCasesPage.jsx` to make document upload optional, supporting both Scenario A (with documents) and Scenario B (without documents).
5. **Odoo Excel File Ingestion**:
   - *Symptom*: Real university Odoo Excel files with title rows and merged Student ID / Name columns failed to parse.
   - *Fix*: Implemented dynamic header row scanning, regex compound column splitting, and serial date converters in `ExcelService.js`.
6. **Data Management UI Modernization**:
   - *Symptom*: Data Management page had visual clutter and redundant cards.
   - *Fix*: Refactored into 4 clean modular sections with page-scoped CSS (`DataManagementPage.css`), preserving 100% of underlying functionality.

---

## 2. Technical Operational Boundaries & Guidelines

### A. Serving Protocol (HTTP Required)
- **Condition**: Double-clicking `dist/index.html` or `index.html` directly from Windows Explorer (opening via the `file://` scheme) is blocked by modern browser security policies (CORS on ES modules).
- **Recommendation**: Always run the application via an HTTP server:
  - **Production:** `node server.js` or `npm start` (serves the application and backend API on `http://localhost:5000`).
  - **Development:** `npm run dev` (starts Vite dev server on `http://localhost:3000`).

### B. LocalStorage Quota Capacity
- **Condition**: Web browsers enforce a domain-level storage quota of approximately 5 MB to 10 MB for `localStorage`.
- **Architecture**: CaseTrack follows an optimal hybrid architecture:
  - Student metadata, stage flags, and activity audit trails are stored in `localStorage` (~1 KB per student).
  - Heavy binary document files (PDFs, JPGs, PNGs) and merged consolidated PDFs are stored directly on the server filesystem under `documents/<studentId>_<studentName>/`.
- **Capacity**: The application comfortably supports 3,000–5,000 active student records in `localStorage`.
- **Maintenance**: For institutional scale (>5,000 records), administrators should utilize the **Download JSON Backup** feature and the **Clear Selected Student Records** tool to archive completed cases.

### C. Backend Server Dependency for File Operations
- **Condition**: Client navigation, student CRUD, Excel import/export, and stage management function entirely client-side. However, the Multi-Step Document Upload Wizard, automatic student folder creation, and A4 consolidated PDF merging require the Node/Express server (`server.js`) to be active.
- **Recommendation**: Keep `server.js` running (`npm start`) during administrative sessions.

### D. Concurrent Multi-Device Synchronization
- **Condition**: In client-side `localStorage` mode, edits made on one machine are scoped to that browser's origin.
- **Recommendation**: Use the JSON Backup and Restore features in Data Management to migrate or synchronize records across distinct administrative workstations.
