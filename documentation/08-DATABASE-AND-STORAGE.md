# 08 - Database Schema and Storage Architecture

**Application:** CaseTrack - Student Case Management System  
**Organization:** Iqra University  

---

## 1. LocalStorage Database Schema (`casetrack_db_v2`)

The application persists all application data under the primary key `casetrack_db_v2`, with automated mirroring to `casetrack_db_v2_last_valid_backup` for disaster recovery.

### Root Database Object

```typescript
interface DatabaseSchema {
  version: "2.0.0";
  lastUpdated: string; // ISO 8601 timestamp
  settings: SystemSettings;
  students: StudentRecord[];
  history: ActivityEvent[];
  notifications: NotificationItem[];
}
```

---

## 2. Entity Schemas

### A. Student Record (`StudentRecord`)

```typescript
interface StudentRecord {
  id: string;                      // Unique ID (e.g., "std-abc12345xyz")
  serialNumber: number;            // Monotonically increasing S.No (1, 2, ...)
  studentId: string;               // University Student ID (e.g., "IU04-0122-0001")
  name: string;                    // Full applicant name (e.g., "Muhammad Ahmed")
  program: string;                 // Degree program code (e.g., "BSCS", "BBA", "MBA")
  programFull?: string | null;     // Full degree name (e.g., "Bachelor of Science in Computer Science")
  approvedDepartments?: string;   // Semicolon-delimited clearance departments
  applyOn: string;                 // ISO date YYYY-MM-DD
  status: WorkflowStatus;          // Current workflow stage
  caseReady: string | null;        // ISO timestamp when marked ready, or null
  sendHistory: SendHistoryEntry[]; // Array of dispatches to Main Campus
  received: string | null;         // ISO timestamp when received / degree issued
  activityHistory: AuditEvent[];   // Immutable audit log of all record actions
  createdAt: string;               // ISO timestamp of registration
  updatedAt: string;               // ISO timestamp of last update
}

type WorkflowStatus = 
  | "Pending"
  | "Case Ready"
  | "Sent to Main Campus"
  | "Returned from Main Campus"
  | "Received from Main Campus";
```

### B. Send History Entry (`SendHistoryEntry`)

```typescript
interface SendHistoryEntry {
  sentAt: string;                  // ISO timestamp when dispatched
  operator: string;                // Name of dispatching officer (e.g., "Admin Officer")
  notes?: string | null;           // Optional dispatch notes / courier tracking ID
  returnedAt?: string | null;      // ISO timestamp if returned by Main Campus
  returnReason?: string | null;    // Mandatory return explanation (>= 5 chars)
}
```

### C. Audit Event (`AuditEvent`)

```typescript
interface AuditEvent {
  action: string;                  // e.g., "Record Created", "Case Ready", "Sent to Main Campus"
  timestamp: string;               // ISO timestamp
  operator: string;                // Officer responsible
  description?: string;            // Human-readable summary
  reason?: string;                 // Return reason if applicable
}
```

### D. System Settings (`SystemSettings`)

```typescript
interface SystemSettings {
  campusName: string;              // Campus title (default: "by Iqra University")
  operatorName: string;            // Default officer identity (default: "Admin Officer")
  pageSize: number;                // Default pagination size (10, 25, 50, 100)
  theme: "light" | "dark";         // Active UI color theme
  sidebarCollapsed: boolean;       // Desktop sidebar collapsed rail state
}
```

---

## 3. Storage Safeguards & Disaster Recovery

1. **Schema Self-Healing (`normalizeStudentRecord`):** Legacy or imported records missing array fields (`sendHistory`, `activityHistory`) are automatically populated with valid empty arrays, preventing `undefined` runtime exceptions.
2. **Quota Monitoring:** LocalStorage quota (typically 5 MB to 10 MB per origin) is monitored in real time. The settings page displays the exact byte size and percentage consumed.
3. **Disaster Recovery:** If `JSON.parse()` fails on the primary storage key due to unexpected browser termination, `StorageService.loadDatabase()` automatically reads `casetrack_db_v2_last_valid_backup` and restores the healthy snapshot without operator intervention.
