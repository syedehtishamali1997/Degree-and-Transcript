# 12 - Testing and Quality Assurance

**Application:** CaseTrack - Student Case Management System  
**Organization:** Iqra University  

---

## 1. Automated Testing Framework

CaseTrack includes comprehensive automated unit and integration verification suites located in the `tests/` directory:

1. **`tests/verify-react-migration.js`:**
   - 17 automated tests covering `StorageService`, `WorkflowService`, `ExcelService`, and validation utilities.
   - Simulates browser LocalStorage via an in-memory Map mock.
   - Run command:
     ```bash
     node tests/verify-react-migration.js
     ```
   - Current Status: **17 PASSED | 0 FAILED** (Exit Code 0).

2. **`tests/test-http-server.js`:**
   - Starts an automated local HTTP static server on port 8089 serving the compiled `dist/` production build.
   - Tests `index.html` loading, MIME types, bundled CSS assets, and JS chunks.
   - Run command:
     ```bash
     node tests/test-http-server.js
     ```
   - Current Status: **ALL TESTS PASSED** (Exit Code 0).

---

## 2. Test Coverage Matrix

| Test Suite | Test Case | Expected Behavior | Result |
| :--- | :--- | :--- | :--- |
| **Storage** | Load empty storage | Initializes schema version 2.0.0 with empty arrays | **PASS** |
| **Storage** | Save and reload | Fully preserves student records without mutation | **PASS** |
| **Storage** | Schema validation | Rejects non-objects and missing `students` arrays | **PASS** |
| **Storage** | Duplicate check | Flags duplicate IDs in JSON import payloads | **PASS** |
| **Workflow** | Create Student | Initializes Stage 0 (Pending) with S.No and timestamp | **PASS** |
| **Workflow** | Duplicate ID check | Throws descriptive error if ID exists | **PASS** |
| **Workflow** | Pending $\to$ Ready | Sets `caseReady` ISO timestamp and `Case Ready` status | **PASS** |
| **Workflow** | Ready $\to$ Sent | Appends dispatch to `sendHistory` with attempt #1 | **PASS** |
| **Workflow** | Return validation | Rejects reasons $< 5$ characters; accepts $\ge 5$ chars | **PASS** |
| **Workflow** | Return $\to$ Resend | Increments attempt number (Attempt #2+) and keeps history | **PASS** |
| **Workflow** | Sent $\to$ Received | Sets `received` timestamp and permanently locks record | **PASS** |
| **Workflow** | Illegal transitions | Disallows skipping stages (e.g. pending to received) | **PASS** |
| **Workflow** | Deletion security | Allows deleting unprocessed; prevents deleting processed | **PASS** |
| **Validation**| Student form | Enforces required Student ID, Name, Program, Apply On | **PASS** |
| **Validation**| Return reason | Enforces non-empty, non-whitespace string $\ge 5$ chars | **PASS** |
| **Utils** | Date formatting | Formats `DD-Mon-YYYY`, durations in hours/days | **PASS** |
| **Excel** | Synonym matching | Resolves "Roll No", "Department", "Date Applied" | **PASS** |

---

## 3. Manual QA Testing Checklist

When performing manual exploratory verification before deployment, follow this sequence:

1. **Dashboard Verification:** Verify KPI counters accurately reflect current database stage numbers.
2. **Student Registration:** Click "+ Add Student", enter sample record, verify toast alert appears and table updates.
3. **Stage-Wise Navigation:** Open `/students/pending`, click "Mark Ready". Switch to `/students/case-ready`, verify student moved and click "Send to Main Campus".
4. **Return Case Testing:** Switch to `/students/sent`, click "Return Case". Attempt entering "abc" (verify error), then enter "Degree fee receipt missing" and verify record moves to `/students/returned`.
5. **Resend Case Testing:** Click "Resend to Campus". Verify attempt number increments to 2 and student moves back to Sent.
6. **Mark Received:** Click "Mark Received". Verify case moves to `/students/received` and deletion/edit controls are disabled.
7. **Excel Import/Export:** Export student dataset to Excel. Open and verify multi-sheet structure. Upload sample template and verify duplicate handling.
8. **Theme Toggle:** Switch between Light and Dark mode in header. Verify colors and contrast remain sharp.
9. **Persistence Check:** Refresh the browser. Verify that all records, stages, and settings remain intact.
