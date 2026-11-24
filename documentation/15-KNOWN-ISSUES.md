# 15 - Known Issues and Edge Cases

**Application:** CaseTrack - Student Case Management System  
**Organization:** Iqra University  

---

## 1. Storage & Persistence Constraints

### A. Single-Device Persistence Boundary
- **Issue:** CaseTrack currently persists data strictly to the client machine's browser LocalStorage (`casetrack_db_v2`). Records created on Workstation A are not automatically mirrored to Workstation B.
- **Mitigation:** Operators should export JSON backups (**Data Management > Download JSON Backup**) to transfer datasets between workstations or share data across campuses.
- **Future Roadmap:** An optional Cloud Firestore / REST backend integration can be introduced to synchronize data in real time across multiple administrative desks.

### B. Incognito / Private Browsing Data Loss
- **Issue:** Web browsers clear LocalStorage automatically when an incognito or private browsing window is closed.
- **Mitigation:** CaseTrack displays an active storage status badge in the header. Operators are instructed never to process university clearance cases in private browsing sessions.

### C. LocalStorage Quota Limits (~5 MB - 10 MB)
- **Issue:** Browser LocalStorage is typically capped at 5 MB to 10 MB. At roughly 1 KB per comprehensive student record (including full dispatch logs), LocalStorage comfortably supports approximately 5,000 to 10,000 active student records before reaching capacity.
- **Mitigation:** CaseTrack actively tracks storage consumption on the Settings page and warns operators when storage reaches 80% capacity.

---

## 2. Browser Environment Nuances

### A. Mobile Zoom on Input Focus
- **Issue:** iOS Safari zooms in automatically when tapping inputs with font sizes below 16px.
- **Resolution:** Form input font sizes are strictly configured to $\ge 1rem$ (16px) in `css/responsive.css` to prevent unintended layout shifting.

### B. Excel Formats (.xls vs .xlsx)
- **Issue:** Obsolete Excel 97-2003 binary formats (`.xls`) with corrupt XML fragments may fail SheetJS strict parsing.
- **Resolution:** `ExcelService.parseExcelFile` wraps SheetJS in a graceful try/catch block and displays descriptive error toasts guiding the operator to save the file as modern `.xlsx`.
