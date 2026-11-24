# CaseTrack - Excel Import & Export Technical Guide
### Odoo Format Compatibility, Column Matching, Collision Rules & Multi-Sheet Export (v2.2.0)

This guide documents the spreadsheet parsing engine, real university Odoo Excel handling, synonym matching rules, duplicate collision strategies, and multi-sheet export generation in **CaseTrack**.

---

## 1. Spreadsheet Architecture Overview

CaseTrack uses SheetJS (`xlsx`) for client-side binary parsing and workbook generation. The spreadsheet logic is encapsulated in `src/services/ExcelService.js`.

The engine is engineered specifically to accept raw, unedited Excel files exported from university ERP platforms, specifically **Odoo CMS** (`odoocms.student.transcript`), without requiring administrative pre-formatting.

---

## 2. Ingestion of Real University Odoo Excel Files

Raw Odoo exports often have structures that cause generic CSV/Excel parsers to fail:
1. Introductory title rows or blank rows before the actual table header.
2. Merged or compound columns where Student ID and Name appear in a single cell (e.g., `IU04-0322-0490 Syeda Yusra Erum`).
3. Mixed date formats, including Excel serial integers and formatted localized strings (`12-Nov-2025`).

### 2.1 Dynamic Header Detection
Instead of assuming row 0 is the header, `ExcelService.findHeaderRowIndex()` inspects the first 15 rows of the worksheet to identify the true header by matching known keywords:
- `Student ID`, `Student`, `Reg No`, `Roll No`, `Student Name`, `Program`, `Date Request`, `Apply Date`.

### 2.2 Combined Student ID & Name Splitting
When Odoo exports student records with Student ID and Name merged in one column, the parser applies regex splitting:
```javascript
// Regex pattern matching university ID followed by space and student name
const combinedMatch = cellValue.match(/^([A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+)\s+(.+)$/i);
if (combinedMatch) {
  studentId = combinedMatch[1].trim();
  studentName = combinedMatch[2].trim();
}
```

### 2.3 Date Parsing Engine
Handles three formats:
1. **Excel Serial Date Numbers**: Converts integer offsets (e.g. `45608`) from the 1900 epoch to ISO YYYY-MM-DD.
2. **Text Formats**: Parses `12-Nov-2025`, `12/11/2025`, `2025-11-12`.
3. **Fallback**: Defaults safely to the current local date if the cell is empty or unparseable.

---

## 3. Flexible Column Synonym Dictionary

`ExcelService.js` maintains a dictionary mapping various column name variants:

| Canonical Field | Recognized Column Synonyms |
| :--- | :--- |
| **Student ID** | `Student ID`, `StudentID`, `Reg No`, `Registration No`, `Roll No`, `Student Number`, `ID`, `Student` |
| **Name** | `Name`, `Student Name`, `Full Name`, `Candidate Name` |
| **Program** | `Program`, `Degree Program`, `Department`, `Discipline`, `Course` |
| **Apply Date** | `Date Request`, `Apply On`, `Application Date`, `Apply Date`, `Request Date`, `Submission Date` |
| **Approved Depts**| `Approved Departments`, `Clearance`, `Departments Approved` |

---

## 4. Duplicate Collision Strategies

When incoming Excel rows match Student IDs already present in LocalStorage:

1. **Skip Existing Records (Default)**:
   - Existing student records and their workflow states are preserved untouched.
   - New students are added to Stage 0 (Pending).
2. **Update Basic Info**:
   - Updates student name, program title, and notes.
   - **Crucial Security Rule**: Preserves existing workflow stage, document status, timestamps, and dispatch history. A student already in "Sent" or "Received" is not moved back to "Pending".
3. **Abort & Report**:
   - Halts the import process immediately if duplicates exist and displays an error summary.

---

## 5. Pre-Import Live Preview Grid

Before committing imported records to the database, the Data Management page displays an interactive preview:
- Metric pills: **Total Rows Found**, **Valid New Students**, **Duplicate Candidates**.
- Filter toggles: **Show All**, **Valid Only**, **Duplicates Only**.
- Preview Table: Displays mapped Student ID, Name, Program, and Apply Date.

---

## 6. Multi-Sheet Excel Export

Clicking **Export to Excel** in Data Management generates a formatted `.xlsx` workbook containing two separate worksheets:

1. **Sheet 1 – `Student Records`**:
   - Columns: `S.No`, `Student ID`, `Name`, `Program`, `Status`, `Stage`, `Apply On`, `Case Ready Date`, `Dispatch Date`, `Received Date`, `Return Count`, `Document Status`.
2. **Sheet 2 – `Workflow History`**:
   - Columns: `Timestamp`, `Action`, `Student ID`, `Student Name`, `Program`, `Operator`, `Description`.

---

## 7. Automated Test Verification

- `tests/test-odoo-excel-import.mjs`: Tests parsing against the actual university file `Student Transcript (odoocms.student.transcript).xlsx`.
  - Verifies 1000+ student records extracted accurately.
  - Confirms zero data loss, correct header detection, and valid date parsing.
