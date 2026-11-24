# CaseTrack – University Odoo Excel Import Fix & Deep Technical Audit Report

**Date:** 20-Nov-2026  
**System:** CaseTrack – Student Case Tracking & Management System (React 19 + Express 5)  
**Target File Tested:** `Student Transcript (odoocms.student.transcript).xlsx`  
**Status:** **100% RESOLVED & VERIFIED**

---

## 1. Executive Summary

When administrators uploaded university transcripts exported directly from Odoo CMS (`Student Transcript (odoocms.student.transcript).xlsx`), student records failed to extract.

### Root Cause Analysis
1. **Combined Student Column:** Odoo CMS exports the student identifier and student name inside a single column titled `Student` (formatted as `IU04-0322-0490 - Syeda Yusra Erum`). The previous `ExcelService` required two distinct columns (`Student ID` and `Student Name`), causing column matching to fail.
2. **Date Request Header & Serial Date Code:** Odoo CMS names the application date `Date Request` rather than `Apply On`, and stores cell values as numeric Excel serial dates (e.g. `45973` for November 12, 2025). The previous date parser expected string ISO dates (`YYYY-MM-DD`).
3. **Empty / Draft Rows:** Rows 739 and 1046 in the Odoo export contain unassigned draft/cancelled records with empty student cells, which previously halted or corrupted parsing.
4. **Duplicate Submissions:** The real Odoo export contains 56 duplicate student IDs (resubmissions or multi-stage transcript requests) that required automated detection and configurable import policies (`skip` vs `overwrite`).

---

## 2. Technical Inspection of Uploaded Odoo Excel File

The actual uploaded file `Student Transcript (odoocms.student.transcript).xlsx` was analyzed:

| Parameter | Detected Value | Notes |
|:---|:---|:---|
| **Active Worksheet** | `Sheet1` | Automatically discovered by worksheet detector |
| **Header Row Position** | Row 1 (Index 0) | Discovered via multi-row synonym heuristic |
| **Total Rows in File** | 1,088 | 1 Header row + 1,087 Data rows |
| **Valid Student Records** | **1,085** | Correctly split and normalized |
| **Invalid / Skipped Rows** | **2** | Row 739 (Draft) and Row 1046 (Cancel) |
| **Duplicate Student IDs** | **56** | Repeated requests (e.g. `IU04-0321-0268`, `IU04-0323-0580`) |
| **Missing Student IDs** | **2** | Precisely matches Rows 739 and 1046 |
| **Missing Names** | **0** | All 1,085 valid rows contained valid names |
| **Missing Programs** | **0** | All 1,085 valid rows contained degree programs |
| **Missing Dates** | **0** | All 1,085 valid rows converted to `YYYY-MM-DD` |

### Column Layout in Odoo Export

```text
[Col 0] Student       -> "IU04-0322-0490 - Syeda Yusra Erum"
[Col 1] Program       -> "AD(DM)-66-ASSOCIATE DEGREE IN DIGITAL MARKETING - FBA"
[Col 2] Institute     -> "Faculty of Business Administration"
[Col 3] Date Request  -> 45973 (Serial Date Code -> 2025-11-12)
[Col 4] Date Approve  -> Null / Timestamp
[Col 5] Date Award    -> 46038.67 (Timestamp)
[Col 6] Status        -> "Done" / "Approved" / "Submit" / "Draft" / "Cancel"
[Col 7] Approvals     -> "HOD, Examination, Accounts, EDP, IRC, Intercampus..."
```

---

## 3. Code Modifications & Architecture Enhancements

### A. Dynamic Header & Column Detection (`src/services/ExcelService.js`)
- Extended `FIELD_SYNONYMS`:
  - `combinedStudent`: `"student"`, `"student name & id"`, `"student details"`, `"candidate"`, `"applicant"`
  - `applyOn`: Added `"date request"`, `"date_request"`, `"request date"`, `"date applied"`, `"submission date"`
  - `status` and `institute`: Added mapping for Odoo workflow stage and faculty.
- Implemented `findHeaderRow(rows)`: Heuristically scans the first 15 rows of the sheet, scoring candidate rows based on recognized columns to find the true header row regardless of introductory rows.

### B. Intelligent Combined Student Splitting (`splitCombinedStudent`)
- Pattern 1: Delimited by hyphen (`-`), en-dash (`–`), em-dash (`—`), colon (`:`), or pipe (`|`) with whitespace.
  - Matches: `IU04-0322-0490 - Syeda Yusra Erum`  
  - Extracted ID: `IU04-0322-0490` | Extracted Name: `Syeda Yusra Erum`
- Pattern 2: University ID format (length >= 5) followed by space and name.
- Fallback: Gracefully handles single-field records or flags rows missing valid names/IDs.

### C. Excel Date Serial Parsing (`src/utils/dateUtils.js` & `ExcelService.js`)
- Enhanced `parseToYYYYMMDD` and `parseExcelDate`:
  - Detects numeric Excel date codes (`val > 1000 && val < 200000`).
  - Utilizes SheetJS `SSF.parse_date_code` and UTC epoch calculations (`1899-12-30`) to compute calendar dates without client-side timezone drift.

### D. Comprehensive Diagnostic Preview UI (`src/pages/DataManagementPage.jsx`)
- **8-Metric Diagnostic Grid:**
  1. Total Rows Scanned
  2. Valid Student Records
  3. Invalid / Skipped Rows
  4. Duplicate Student IDs (in file)
  5. Missing Student IDs
  6. Missing Names
  7. Missing Programs
  8. Missing Application Dates
- **Skipped Rows Notice:** Collapsible drawer detailing row numbers and failure reasons (e.g. `Row 739: Missing Student ID (Status: Draft)`).
- **Interactive Preview Table:**
  - Real-time search filter across Student ID, Name, Program, and Status.
  - Configurable pagination (10, 25, 50, 100 rows per page).
  - Explicit columns: `#`, `Excel Row`, `Student ID`, `Student Name`, `Program`, `Apply On`, `Status`.
- **Duplicate Handling Selection:** Support for both `"skip"` (preserves existing database records) and `"overwrite"` (updates existing records with latest Excel data).

---

## 4. Test Verification & Results

A new automated test suite was introduced in `tests/test-odoo-excel-import.mjs` and integrated into `npm run test:all`:

```bash
> node tests/test-odoo-excel-import.mjs

=== Testing ExcelService Odoo & Template Parsing ===

[Test 1] splitCombinedStudent tests:
  ✓ Standard hyphen delimiter passed
  ✓ En-dash delimiter passed
  ✓ Space prefix without hyphen passed

[Test 2] parseExcelDate tests:
  ✓ Excel serial number 45973 -> 2025-11-12
  ✓ ISO string 2026-11-20 passed
  ✓ Date object passed

[Test 3] Parsing actual university Odoo Excel file:
  Sheet Name: Sheet1
  Header Row: 1
  Total Data Rows: 1087
  Valid Records Extracted: 1085
  Invalid Rows Skipped: 2
  Duplicate Student IDs within file: 56
  Missing Student IDs: 2
  Missing Names: 0
  Missing Programs: 0
  Missing Dates: 0
  ✓ First student record verified: IU04-0322-0490 Syeda Yusra Erum 2025-11-12
  ✓ Last student record verified: IU04-0122-1229 Ayaz Ali 2026-11-18
  ✓ Expected invalid rows (739, 1046) properly isolated

[Test 4] Standard sample template compatibility test:
  ✓ Standard template parsed correctly (4 valid rows)

=== All Odoo Excel Import & Standard Template Tests Passed Successfully! ===
```

### Full System Verification (`npm run test:all`)
- **Relative import checks:** 0 errors across 38 files.
- **Migration & Database tests:** 18/18 passed.
- **16-Step E2E Document Workflow:** 16/16 passed (100%).
- **PDF Generation & Document Storage:** 4/4 passed.
- **Backend Express REST APIs:** 5/5 passed.
- **Real Browser E2E Interaction Test:** 7/7 passed (0 exceptions).
- **Odoo Excel Import Test:** 4/4 passed.
- **Production Build (`vite build`):** Built cleanly in 2.43s with 0 errors.

---

## 5. File References

- Service Implementation: [ExcelService.js](file:///c:/Users/ehtisham.ali/Pictures/Degree%20and%20Transcript%20App/src/services/ExcelService.js)
- UI Preview Component: [DataManagementPage.jsx](file:///c:/Users/ehtisham.ali/Pictures/Degree%20and%20Transcript%20App/src/pages/DataManagementPage.jsx)
- Date Utilities: [dateUtils.js](file:///c:/Users/ehtisham.ali/Pictures/Degree%20and%20Transcript%20App/src/utils/dateUtils.js)
- Test Suite: [test-odoo-excel-import.mjs](file:///c:/Users/ehtisham.ali/Pictures/Degree%20and%20Transcript%20App/tests/test-odoo-excel-import.mjs)
- Verified Excel Fixture: [Student Transcript (odoocms.student.transcript).xlsx](file:///c:/Users/ehtisham.ali/Pictures/Degree%20and%20Transcript%20App/Student%20Transcript%20(odoocms.student.transcript).xlsx)
