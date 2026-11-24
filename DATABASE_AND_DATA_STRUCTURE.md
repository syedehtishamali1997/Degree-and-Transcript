# CaseTrack - Database & Data Structure Specification
### Schema Definitions, Persistence Architecture & Storage Models (v2.2.0)

This document defines the complete data dictionary, JSON schema specifications, physical directory structures, and validation rules governing data integrity in **CaseTrack**.

---

## 1. Storage Architecture Overview

CaseTrack utilizes a hybrid persistence model:
1. **Application Data & State**: Stored client-side in browser `LocalStorage` as a single-source-of-truth JSON document under key `casetrack_db_v2`.
2. **Crash & Corruption Recovery**: Automatically mirrored in `LocalStorage` under `casetrack_db_v2_last_valid_backup` upon every successful write operation.
3. **Physical Documents & Transcripts**: Persisted on the host server filesystem under the `documents/` directory, managed by the Node.js/Express backend service.
4. **Offline Safety Backups**: Automated export of immutable JSON snapshots before destructive operations.

---

## 2. JSON Database Schema

### 2.1 Database Root Object (`DatabaseRoot`)

```typescript
interface DatabaseRoot {
  version: string;             // Database schema version (e.g. "2.2.0")
  lastUpdated: string;         // ISO 8601 timestamp of last state mutation
  settings: SettingsObject;    // Administrative and display preferences
  students: StudentRecord[];   // Array of all student application records
  history: ActivityEvent[];    // Global chronological audit event log
  notifications: NotificationObject[]; // System alerts and warnings
}
```

### 2.2 Student Record Schema (`StudentRecord`)

```typescript
interface StudentRecord {
  id: string;                  // Unique internal UUID / string identifier
  serialNumber: number;        // Display sequence number (S.No, 1-based)
  studentId: string;           // University Student ID (e.g. "IU04-0319-0302"), unique & trimmed
  name: string;                // Student full name
  program: string;             // Academic degree program abbreviation (e.g. "BSCS", "BBA")
  programFull: string | null;  // Complete program title (optional)
  approvedDepartments: string | null; // Departmental clearance approvals (optional)
  applyOn: string;             // Date application filed (Format: YYYY-MM-DD or ISO)
  status: StudentStatus;       // Current lifecycle workflow state
  caseReady: string | null;    // ISO 8601 timestamp when marked Case Ready, or null
  
  // Document Management Metadata
  documentStatus: DocumentStatus; // Status of uploaded academic files
  documentFolder: string | null;  // Relative folder name on disk (e.g. "IU04-0319-0302_Simra_Rehan")
  documentSubmittedAt: string | null; // ISO 8601 timestamp of document consolidation
  finalPdfUrl: string | null;     // Backend API streaming endpoint for consolidated PDF
  documentsList: DocumentAttachment[]; // Array of attached individual PDF files

  // Dispatch & Courier History
  sendHistory: SendHistoryEntry[]; // Log of all courier dispatches, returns, and resends
  received: string | null;         // ISO 8601 timestamp when degree received (final completion)
  
  // Audit Trail & Timestamps
  activityHistory: StudentActivityHistoryEntry[]; // Per-student append-only audit log
  createdAt: string;           // ISO 8601 creation timestamp
  updatedAt: string;           // ISO 8601 last modified timestamp
}
```

### 2.3 Enumerations

```typescript
type StudentStatus = 
  | "pending"                   // Stage 0: Initial intake and document collection
  | "case_ready"                // Stage 1: Verified, consolidated & ready for dispatch (Docs optional)
  | "sent"                      // Stage 2: Dispatched to main campus via courier
  | "returned"                  // Action Required: Returned with remarks from main campus
  | "received";                 // Stage 3: Completed, degree issued, permanently locked

type DocumentStatus =
  | "Not Uploaded"              // No files uploaded
  | "Incomplete"                // Partial files uploaded
  | "Documents Uploaded"        // Files uploaded, pending consolidation
  | "Submitted"                 // Validated and consolidated into Final_Student_Document.pdf
  | "Ready for Processing";     // Approved by administrator
```

### 2.4 System Settings Object (`SettingsObject`)

```typescript
interface SettingsObject {
  campusName: string;          // Campus branding (e.g. "by Iqra University")
  operatorName: string;        // Officer name (e.g. "Admin Officer")
  theme: "light" | "dark";     // CoreUI 5 theme mode (persisted to data-bs-theme)
  sidebarCollapsed: boolean;   // Desktop sidebar toggle state
  pageSize: number;            // Default table rows per page (10, 25, 50, 100)
  autoBackupOnPurge: boolean;  // Always true: safety guard before destructive operations
  branding?: BrandingConfig;   // Dynamic application branding configuration
}

interface BrandingConfig {
  appName: string;             // Primary application name (e.g. "CaseTrack")
  campusSubtitle: string;      // Institutional subtitle (e.g. "by Iqra University")
  logoType: "default" | "custom"; // Logo presentation mode
  logoUrl: string | null;      // Base64 data URL or custom image URL
  faviconUrl: string | null;   // Dynamically injected browser favicon
  updatedAt: string | null;    // ISO 8601 timestamp of last branding update
}
```

### 2.5 Audit Activity Event (`ActivityEvent`)

```typescript
interface ActivityEvent {
  id: string;                  // Unique event identifier
  action: string;              // Action title (e.g. "Marked Case Ready", "Dispatched to Main Campus")
  timestamp: string;           // ISO 8601 event timestamp
  operator: string;            // Operator responsible
  studentId: string;           // Target Student ID or "ALL" or "Bulk"
  studentName: string;         // Target student name
  program: string;             // Academic program
  description: string;         // Detailed audit remarks
}
```

---

## 3. Physical Document Folder Hierarchy

Under `documents/` on the server filesystem:

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
    └── Final_Student_Document.pdf    <-- Automated consolidated output
```

### Server Folder Lifecycle Endpoints:
- `POST /api/students/init-folder`: Creates a single student's document folder on registration.
- `POST /api/students/init-folders-bulk`: Creates folders in bulk upon Excel batch ingestion.
- `POST /api/students/cleanup-folders`: Safely removes physical folders for deleted student IDs.
- `POST /api/students/clear-all-folders`: Safely empties the `documents/` directory when database purge is executed.
- `DELETE /api/students/:id/documents`: Removes a specific student's folder and files.

---

## 4. Defensive Zero-Record Immunity

The database engine guarantees total runtime immunity when the student array is empty (`students: []`):
- `counts`: All stage counts default safely to `0`.
- `completionRate`: Returns `"0%"` rather than `NaN`.
- `avgTurnaround`: Returns `"--"` without divide-by-zero errors.
- `programs`: Safely returns an empty array `[]` without iteration errors.
- Tables render responsive Empty State graphics without breaking table headers.

---

## 5. Enterprise 100 GB Data Storage Model

To support up to 100 GB of student records, documents, PDFs, and backups, CaseTrack uses a tiered persistence model:

### 5.1 Storage Directory Schema
```
CaseTrack Application Root/
├── documents/                      <-- Student document folders & consolidated PDFs (100 MB max/file)
│   └── {StudentID}_{StudentName}/
│       ├── transcripts/
│       ├── academic_documents/
│       ├── Additional_Degrees/
│       ├── student_information.json
│       └── Final_Student_Document.pdf
├── data/                           <-- Persistent server-side database
│   └── casetrack_database.json     <-- Master JSON database snapshot
└── backups/                        <-- Rotational safety backups
    ├── casetrack_backup_2026-11-21T10-26-46.json
    └── ... (25 circular backups max)
```

### 5.2 Storage Telemetry Object (`/api/storage/metrics`)
```typescript
interface StorageMetricsResponse {
  ok: boolean;
  targetCapacityGB: 100;
  targetCapacityBytes: 107374182400; // 100 GiB
  targetCapacityFormatted: "100.00 GB";
  usedBytes: number;
  usedFormatted: string;             // e.g. "374.42 KB"
  availableBytes: number;
  availableFormatted: string;        // e.g. "41.44 GB"
  usagePercent: number;              // e.g. 0.001
  breakdown: {
    studentDocuments: { bytes: number; formatted: string; fileCount: number; folderCount: number };
    database: { bytes: number; formatted: string; recordCount: number; exists: boolean };
    backups: { bytes: number; formatted: string; fileCount: number; latestBackup: string | null };
  };
  physicalDrive: {
    driveRoot: string;               // e.g. "C:\\"
    totalBytes: number;              // e.g. 321,366,519,808
    freeBytes: number;               // e.g. 44,488,118,272
    supportsTargetCapacity: boolean; // true
  };
}
```

---

## 6. Authentication, User Accounts & Session Data Structures

### 6.1 User Account Schema (`data/users.json`)
```typescript
interface UserAccount {
  id: string;                  // e.g. "usr-super-admin-001"
  fullName: string;            // e.g. "Sarah Khan"
  username: string;            // Unique alphanumeric username, e.g. "skhan"
  email: string;               // Valid university email, e.g. "skhan@casetrack.iqra.edu.pk"
  passwordHash: string;        // Scrypt hash format: <salt_hex>:<hash_hex>
  role: "super_admin" | "admin_officer" | "registrar_desk" | "viewer";
  department: string;          // e.g. "Registrar Office / Examinations Desk"
  status: "active" | "inactive";
  createdAt: string;           // ISO 8601 timestamp
  updatedAt: string;           // ISO 8601 timestamp
  lastLogin: string | null;    // ISO 8601 timestamp of most recent authentication
  createdBy: string;           // Creator username or "System Bootstrap"
}
```

### 6.2 Role Definition & Permissions Schema (`data/roles.json`)
```typescript
interface RoleDefinition {
  id: "super_admin" | "admin_officer" | "registrar_desk" | "viewer";
  name: string;                // e.g. "Super Admin"
  description: string;         // Role responsibilities
  permissions: string[];       // Array of authorized granular permission keys or ["*"]
}
```

### 6.3 Active Sessions Store (`data/sessions.json`)
```typescript
interface ActiveSession {
  token: string;               // 64-character hexadecimal cryptographically random token
  userId: string;              // Target user id
  username: string;            // Operator username
  role: string;                // Active assigned role
  createdAt: string;           // ISO 8601 creation timestamp
  expiresAt: string;           // ISO 8601 expiration timestamp (24h or 30d for remember-me)
  rememberMe: boolean;
}
```
