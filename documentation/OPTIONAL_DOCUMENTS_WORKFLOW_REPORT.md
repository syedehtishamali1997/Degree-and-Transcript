# CaseTrack – Optional Document Upload for Mark Ready Workflow

**Date:** 20-Nov-2026  
**System:** CaseTrack (React 19 + Express 5)  
**Feature:** Optional Document Upload & Decoupled Workflow Transitions  
**Status:** **100% IMPLEMENTED & VERIFIED**

---

## 1. Executive Summary

Previously, the **Mark Ready** button in the *Pending Cases* queue was disabled for any student whose `Document Status` was `Not Uploaded`. Marking a case as Ready threw a validation error requiring all clearance documents to be submitted and consolidated into a PDF first.

In real-world campus operations, administrators often need to advance verified student requests to the **Case Ready** queue immediately (e.g. bulk-imported transcripts from Odoo CMS) while retaining the flexibility to upload, append, or inspect documents either before or after marking the case ready.

The workflow has been updated to make **document upload strictly optional**:
- **Scenario A (Documents Uploaded):** Administrator uploads documents $\to$ clicks *Mark Ready* $\to$ case moves to *Case Ready* with document status `Submitted` / `Uploaded`.
- **Scenario B (No Documents Uploaded):** Administrator does not upload documents $\to$ clicks *Mark Ready* $\to$ case moves to *Case Ready* with document status remaining `Not Uploaded`.

---

## 2. Key Functional & Architectural Changes

### A. Workflow State Machine Decoupling ([WorkflowService.js](file:///c:/Users/ehtisham.ali/Pictures/Degree%20and%20Transcript%20App/src/services/WorkflowService.js))
- **`canMarkReady(student)`:** Removed the requirement for `documentSubmittedAt` or `documentStatus === "Submitted"`. The method now strictly validates that:
  1. The student record exists with status `Pending` (`STATUS.PENDING`).
  2. `caseReady` timestamp is `null`.
  3. Essential student demographic identifiers (`studentId` and `name`) are present and non-empty.
- **`markCaseReady(student, operatorName)`:** Advances `status` to `Case Ready` (`STATUS.READY`), records the `caseReady` ISO timestamp, and appends a `Case Ready` history event. **Document status is preserved unchanged** (e.g. remains `Not Uploaded` if no documents were attached).
- **`DOCUMENT_STATUS` Constants:** Extended to explicitly include `NOT_UPLOADED: "Not Uploaded"`, `PARTIALLY_UPLOADED: "Partially Uploaded"`, `INCOMPLETE: "Incomplete"`, `UPLOADED: "Uploaded"`, `SUBMITTED: "Submitted"`, and `READY: "Ready for Processing"`.

### B. Action Controls in Pending Cases Table ([StudentRecordsTable.jsx](file:///c:/Users/ehtisham.ali/Pictures/Degree%20and%20Transcript%20App/src/components/tables/StudentRecordsTable.jsx))
- **`Mark Ready` Button:** Always enabled (`btn-primary`) for all pending records with valid student IDs and names, regardless of document upload status.
- **`Edit & Upload Docs` Button:** Maintained as an active primary action for entering the 4-step wizard.

### C. Case Ready Queue Enhancements ([StudentRecordsTable.jsx](file:///c:/Users/ehtisham.ali/Pictures/Degree%20and%20Transcript%20App/src/components/tables/StudentRecordsTable.jsx))
- Added an **`Upload Docs`** button (`openUploadWizard(s)`) directly in the *Case Ready* table actions so administrators can upload transcripts/certificates later without resetting workflow state.
- **Graceful Download / Print Handling:**
  - If documents exist: Download Complete PDF and Print buttons are active.
  - If no documents exist: Download and Print buttons are safely disabled with informative tooltips (`No documents uploaded to download/print`) preventing 404 or missing file errors.
- **`Send to Main Campus`:** Fully operational for all Case Ready records.

### D. Document Viewer Updates ([ViewDocumentsModal.jsx](file:///c:/Users/ehtisham.ali/Pictures/Degree%20and%20Transcript%20App/src/components/modals/ViewDocumentsModal.jsx))
- When viewing a case without uploaded documents, the modal displays a clear empty state with an **`Upload Documents Now`** button that opens the upload wizard directly.

### E. Status Badging ([Badge.jsx](file:///c:/Users/ehtisham.ali/Pictures/Degree%20and%20Transcript%20App/src/components/common/Badge.jsx))
- Updated `DocumentStatusBadge` to cleanly style `Not Uploaded` (secondary dash), `Partially Uploaded` / `Incomplete` (warning triangle), `Uploaded` / `Submitted` (primary checkmark), and `Ready for Processing` (success circle).

---

## 3. Automated Test Suite Results

A comprehensive 10-point test suite was implemented in [test-optional-document-mark-ready.mjs](file:///c:/Users/ehtisham.ali/Pictures/Degree%20and%20Transcript%20App/tests/test-optional-document-mark-ready.mjs) and verified:

```text
======================================================================
  CASETRACK OPTIONAL DOCUMENT UPLOAD & MARK READY TEST SUITE         
======================================================================

[Check Initial Counts]
  ✓ Initial State: Total = 3, Pending = 3, Ready = 0

[Test 1] Scenario B: Mark Ready with NO documents uploaded
  ✓ Case moved to Case Ready successfully without documents.
  ✓ Document Status correctly preserved as 'Not Uploaded'.

[Test 2] Scenario A: Mark Ready with ALL documents uploaded
  ✓ Case moved to Case Ready with existing documents intact.

[Test 3] Mark Ready with PARTIALLY uploaded documents
  ✓ Case moved to Case Ready with partially uploaded documents preserved.

[Test 4] Upload documents AFTER marking Ready (stud-01)
  ✓ Documents uploaded later: status retained as 'Case Ready', files attached cleanly.

[Test 5] Refresh & LocalStorage reload simulation
  ✓ Database persisted and reloaded cleanly with zero state corruption.

[Test 6] Verify Pending Cases count
  ✓ Pending Cases count correctly reduced to: 0

[Test 7] Verify Case Ready count
  ✓ Case Ready count correctly increased to: 3

[Test 8] Verify Dashboard metrics calculation
  ✓ Dashboard metrics calculation matches updated state exactly: { total: 3, pending: 0, ready: 3, sent: 0, returned: 0, received: 0 }

[Test 9] Verify Workflow history and timestamps
  ✓ Case Ready & Documents Submitted history logged chronologically with timestamps.

[Test 10] Verify No Duplicate Student Records
  ✓ Unique student records confirmed: zero duplicates generated.

======================================================================
  ALL 10 OPTIONAL DOCUMENT & MARK READY TESTS PASSED (100% SUCCESS)! 
======================================================================
```

### Full System Verification (`npm run test:all`)
- **Relative import checks:** 0 errors across 38 files.
- **Migration & Database tests:** 19/19 passed.
- **16-Step E2E Document Workflow:** 16/16 passed (100%).
- **PDF Generation & Document Storage:** 4/4 passed.
- **Backend Express REST APIs:** 5/5 passed.
- **Real Browser E2E Interaction Test:** 7/7 passed (0 exceptions).
- **Odoo Excel Import Test:** 4/4 passed.
- **Optional Document & Mark Ready Suite:** 10/10 passed.
- **Production Build (`vite build`):** Built cleanly in 2.44s with 0 errors.
