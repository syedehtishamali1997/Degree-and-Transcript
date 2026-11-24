# CaseTrack - Document Management & PDF Consolidation Guide
### File Uploads, Validation, Physical Storage & PDF Merging Engine (v2.2.0)

This document specifies the document processing pipeline, storage folder hierarchies, PDF consolidation algorithms, and document lifecycle APIs in **CaseTrack**.

---

## 1. Document Architecture Overview

CaseTrack combines a client-side multi-step wizard with a Node.js/Express document service (`server/documentService.js`) powered by `multer` and `pdf-lib`.

```
documents/
└── {StudentID}_{StudentName}/
    ├── transcripts/
    │   ├── EDP_Transcript.pdf
    │   └── Exam_Transcript.pdf
    ├── academic_documents/
    │   ├── Matric_Certificate.pdf
    │   ├── Intermediate_Marksheet.pdf
    │   └── Intermediate_Certificate.pdf
    ├── Additional_Degrees/
    │   ├── Bachelor_Transcript.pdf
    │   └── Master_Degree.pdf
    └── Final_Student_Document.pdf    <-- Consolidated master output
```

---

## 2. Multi-Step Document Upload Wizard

Accessible via the **Edit & Upload Docs** button in student tables:

1. **Step 1 – Student Information Verification**:
   - Displays Student ID, Name, Degree Program, and Application Date.
   - Allows updating departmental clearances or spelling errors before attaching documents.
2. **Step 2 – Transcripts Upload**:
   - Slot 1: EDP Transcript (Electronic Data Processing).
   - Slot 2: Examination Department Transcript.
   - Features file preview, replacement, and removal before submission.
3. **Step 3 – Academic Documents & Additional Degrees**:
   - Standard academic slots: Matriculation Certificate, Intermediate Marksheet, Intermediate Certificate.
   - Dynamic Additional Degrees: Allows administrators to add unlimited additional degree files (e.g. B.Com, BA, BSc, Postgraduate diplomas) with custom degree labels.
4. **Step 4 – Review & Consolidation**:
   - Comprehensive checklist summarizing attached files and total size.
   - On clicking **Submit & Consolidate**, the wizard uploads all files to the Express backend via `multipart/form-data`.

---

## 3. Server-Side Document Validation & Security

Before saving files to disk, `server/documentService.js` enforces strict safety checks:

1. **MIME Type Validation**:
   - Files must report `application/pdf`. Non-PDF uploads are rejected.
2. **Magic Byte Header Inspection**:
   - Reads the first 5 bytes of the binary buffer. Files MUST begin with `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`). Disguised executables or corrupted binaries are rejected immediately.
3. **File Size Limit**:
   - Enforces a 15MB limit per individual file to protect disk space.
4. **Path Sanitization**:
   - Strips dangerous characters (`..`, `/`, `\`, colons) from folder and file names to prevent path traversal vulnerabilities.

---

## 4. Automated PDF Consolidation Engine (`pdf-lib`)

Once all files are saved to their respective subdirectories, the backend consolidation engine executes:

```javascript
// Consolidation Algorithm in server/documentService.js
const finalDoc = await PDFDocument.create();

// Process files in strict order:
// 1. transcripts/
// 2. academic_documents/
// 3. Additional_Degrees/
for (const filePath of orderedFilePaths) {
  const bytes = fs.readFileSync(filePath);
  const srcDoc = await PDFDocument.load(bytes);
  const pageIndices = srcDoc.getPageIndices();
  const copiedPages = await finalDoc.copyPages(srcDoc, pageIndices);

  for (const page of copiedPages) {
    // Scale each page to uniform A4 dimensions (595.28 x 841.89 points)
    const { width, height } = page.getSize();
    page.scale(595.28 / width, 841.89 / height);
    finalDoc.addPage(page);
  }
}

const finalPdfBytes = await finalDoc.save();
fs.writeFileSync(path.join(studentDir, "Final_Student_Document.pdf"), finalPdfBytes);
```

### Key Advantages:
- **Uniformity**: Every page, regardless of its original scanned resolution or aspect ratio, scales to uniform A4 size for printing.
- **Original Preservation**: Original source documents are preserved intact in their subdirectories; only a copy is compiled into the master dossier.

---

## 5. In-App Document Viewer & Actions

Clicking **View Documents** opens `ViewDocumentsModal.jsx`:
- **Live In-Browser Preview**: Embeds the consolidated PDF in a high-resolution viewer.
- **Download Dossier**: Direct download of `Final_Student_Document.pdf`.
- **Direct Printing**: Launches the browser's native print preview dialog pre-configured for A4 printing.

---

## 6. Document Lifecycle & Cleanup REST APIs

To prevent orphan folders on disk when student records are deleted from LocalStorage:

| Endpoint | Method | Payload | Action |
| :--- | :--- | :--- | :--- |
| `/api/students/init-folder` | POST | `{ studentId, name }` | Pre-creates student folder structure on registration. |
| `/api/students/init-folders-bulk` | POST | `{ students: [...] }` | Pre-creates folder structures in bulk on Excel import. |
| `/api/students/cleanup-folders` | POST | `{ studentIds: [...] }` | Safely removes folders for deleted student IDs. |
| `/api/students/clear-all-folders`| POST | `{}` | Safely deletes all student folders on database purge. |
| `/api/documents/:folder/final-pdf` | GET | URL param | Streams consolidated PDF with inline Content-Disposition. |

---

## 7. Automated Document Tests

- `tests/test-document-server.js`: Verifies folder creation, multi-file uploads, and PDF compilation.
- `tests/test-complete-workflow-e2e.js`: Full 16-step integration test validating the complete document workflow.
