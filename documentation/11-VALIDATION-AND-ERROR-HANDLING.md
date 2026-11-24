# 11 - Validation and Error Handling

**Application:** CaseTrack - Student Case Management System  
**Organization:** Iqra University  

---

## 1. Input Validation Rules

All user inputs are validated before state persistence using pure validator utilities in `src/utils/validators.js`.

### A. Student Record Validation (`validateStudentInput`)
- **Student ID:**
  - Mandatory. Cannot be empty or whitespace.
  - Case-insensitive uniqueness check against existing records:
    $$\text{cleanId} = \text{input.studentId.trim().toLowerCase()}$$
    $$\exists s \in \text{database.students} \mid s.\text{id} \neq \text{currentId} \land s.\text{studentId.toLowerCase()} = \text{cleanId} \implies \text{Error: Duplicate}$$
- **Student Name:**
  - Mandatory. Minimum length of 2 characters.
- **Degree Program:**
  - Mandatory. Must be selected or entered.
- **Apply On Date:**
  - Mandatory. Validated and formatted to ISO `YYYY-MM-DD`.

### B. Return Reason Validation (`validateReturnReason`)
- When returning a case from Main Campus to campus origin:
  - Mandatory. Empty string or whitespace-only inputs are rejected.
  - **Minimum length:** Strict enforcement of $\ge 5$ characters (e.g. "Fee dues pending", "Incomplete clearance folder").

---

## 2. File & Import Validation

### A. Excel Spreadsheet Ingestion (`ExcelService.parseExcelFile`)
- Accepts `.xlsx` and `.xls` files.
- Inspects worksheet headers dynamically using fuzzy synonym matching.
- Rows missing a valid Student ID are skipped with warnings in the preview log.
- Supports duplicate resolution policies:
  - **Skip:** Preserves existing records in the database.
  - **Overwrite:** Updates demographic details while protecting case status and workflow timestamps.

### B. JSON Database Schema Validation (`validateDatabaseSchema`)
- Verifies that root payload is an object containing a `students` array.
- Scans incoming records for duplicate Student IDs before committing to storage.
- Rejects corrupted or malformed payloads with descriptive error alerts.

---

## 3. Storage Quota & Exception Handling

If browser LocalStorage reaches capacity ($> 5$ MB) during save operations:
1. `StorageService.saveDatabase()` catches `QuotaExceededError`.
2. Emits an urgent warning toast advising the operator to export a JSON backup immediately.
3. Automatically triggers fallback mirroring to `casetrack_db_v2_last_valid_backup`.
