# CaseTrack - Security & Data Integrity Specification
### Data Protection, Upload Security, Path Sanitization & Deletion Safeguards (v2.2.0)

This document establishes the security mechanisms, data integrity constraints, upload defenses, and accidental data loss prevention safeguards implemented in **CaseTrack**.

---

## 1. Accidental Data Loss Prevention Safeguards

CaseTrack enforces strict guardrails against accidental loss of student records, dispatch history, or physical documents:

### 1.1 Multi-Tier Deletion Protection
1. **Single Record Deletion**:
   - Requires explicit operator confirmation via a modal dialog displaying target student metadata (Student ID, Name, Program).
2. **Selective Bulk Deletion**:
   - Administrators must consciously select candidate records via checkboxes or filter matching.
   - Shows candidate preview with total count before triggering confirmation dialog.
3. **Database Purge (Clear All Student Data)**:
   - High-risk destructive operation protected by an exact-string typing challenge:
     `DELETE ALL STUDENT DATA`
   - Case-sensitive and exact-match verification prevents accidental clicks.
   - Automatically downloads an offline JSON backup (`casetrack_safety_backup_*.json`) to the operator's computer prior to purging state.

---

## 2. File Upload Security & Integrity

The Express document service (`server/documentService.js`) enforces multi-stage defense-in-depth on all uploaded files:

### 2.1 Magic Byte Inspection (`%PDF-`)
- Client-supplied file extensions and MIME headers are inherently untrusted.
- Upon receiving a file chunk, the backend inspects the first 5 binary bytes.
- The buffer MUST match `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`). Disguised executables, shell scripts, or polyglot files are rejected immediately.

### 2.2 File Size Limits
- Strict 15MB limit per individual uploaded file enforced via Multer middleware.
- Oversized payloads trigger HTTP 400 Bad Request with descriptive rejection notes.

### 2.3 Directory Traversal & Path Sanitization
- Student IDs and names can originate from user input or external Excel imports.
- To prevent Directory Traversal attacks (e.g. `../../etc/passwd` or `..\Windows\System32`):
  ```javascript
  // Sanitization in server/documentService.js
  const safeId = studentId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeName = studentName.replace(/[^a-zA-Z0-9_\s-]/g, "_").trim().replace(/\s+/g, "_");
  const folderName = `${safeId}_${safeName}`;
  const targetDir = path.resolve(DOCUMENTS_ROOT, folderName);

  // Assert targetDir stays strictly within DOCUMENTS_ROOT
  if (!targetDir.startsWith(DOCUMENTS_ROOT)) {
    throw new Error("Invalid folder path: Traversal detected.");
  }
  ```

---

## 3. LocalStorage Persistence & Corruption Defense

- **Schema Normalization**: Every database mutation passes through `normalizeDatabase()`, ensuring all fields exist with valid default values.
- **Defensive Mirroring**: On every successful write to `casetrack_db_v2`, a duplicate copy is written to `casetrack_db_v2_last_valid_backup`.
- **Auto-Recovery**: If `casetrack_db_v2` is corrupted or unparseable, `StorageService.loadDatabase()` transparently recovers from the mirror backup.
- **Quota Monitoring**: The application actively monitors LocalStorage consumption against standard browser limits (~5MB) and warns the operator in the sidebar when usage approaches boundary thresholds.
