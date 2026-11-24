/**
 * ExcelService.js
 * SheetJS spreadsheet integration for bulk importing, template generation, and multi-sheet exports.
 * Fully supports university Odoo CMS exports, combined Student columns, dynamic header row discovery,
 * serial date numbers, and diagnostic preview metrics.
 */

import * as XLSX from "xlsx";
import { parseToYYYYMMDD, todayYYYYMMDD, formatDateOnly, formatTimestamp } from "../utils/dateUtils.js";
import { WorkflowService } from "./WorkflowService.js";

/**
 * Parses any date value (Excel serial number, Date instance, or date string) into YYYY-MM-DD.
 */
export function parseExcelDate(val) {
  if (val === null || val === undefined || val === "") return null;
  const pad = (n) => String(n).padStart(2, "0");

  if (val instanceof Date && !isNaN(val.getTime())) {
    return `${val.getFullYear()}-${pad(val.getMonth() + 1)}-${pad(val.getDate())}`;
  }

  if (typeof val === "number" && isFinite(val)) {
    try {
      const d = XLSX.SSF.parse_date_code(val);
      if (d && d.y) {
        return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
      }
    } catch {
      // Fallback UTC conversion
    }
    return parseToYYYYMMDD(val);
  }

  return parseToYYYYMMDD(val);
}

/**
 * Splits a combined student field (e.g. "IU04-0322-0490 - Syeda Yusra Erum") into studentId and name.
 */
export function splitCombinedStudent(rawStr) {
  if (!rawStr) return { studentId: "", name: "" };
  const s = String(rawStr).trim();

  // Pattern 1: Delimited by dash/separator with whitespace: e.g. "IU04-0322-0490 - Syeda Yusra Erum"
  const spacedSepMatch = s.match(/^(\S+)\s*[-–—:|]\s+(.+)$/);
  if (spacedSepMatch) {
    return {
      studentId: spacedSepMatch[1].trim(),
      name: spacedSepMatch[2].trim()
    };
  }

  // Pattern 2: University ID format (length >= 5) followed by space and name
  const prefixMatch = s.match(/^([A-Za-z0-9\-_/]{5,})\s+(.+)$/);
  if (prefixMatch) {
    return {
      studentId: prefixMatch[1].trim(),
      name: prefixMatch[2].trim()
    };
  }

  // Pattern 3: Any non-whitespace token followed by name
  const tokenMatch = s.match(/^(\S+)\s+(.+)$/);
  if (tokenMatch) {
    return {
      studentId: tokenMatch[1].trim(),
      name: tokenMatch[2].trim()
    };
  }

  return { studentId: s, name: "" };
}

export const ExcelService = {
  FIELD_SYNONYMS: {
    studentId: [
      "student id", "studentid", "student_id", "roll no", "rollno",
      "reg no", "registration no", "registration_no", "enrollment", "cms id", "id"
    ],
    name: [
      "student name", "student_name", "full name", "fullname", "candidate name",
      "applicant name", "name"
    ],
    combinedStudent: [
      "student", "student name & id", "student name and id", "student details",
      "student info", "candidate", "applicant"
    ],
    program: [
      "program", "degree", "department", "degree program", "dept", "course", "major"
    ],
    applyOn: [
      "date request", "date_request", "request date", "apply on", "apply_on",
      "application date", "apply date", "applied on", "date of application",
      "date applied", "submission date", "date"
    ],
    status: [
      "status", "current status", "state", "stage"
    ],
    institute: [
      "institute", "faculty", "campus", "school"
    ]
  },

  matchColumnIndex(headers, synonymList) {
    for (let i = 0; i < headers.length; i++) {
      const clean = String(headers[i] || "").toLowerCase().trim().replace(/[^a-z0-9]/g, " ");
      const normalized = clean.replace(/\s+/g, " ");
      for (let s = 0; s < synonymList.length; s++) {
        if (normalized === synonymList[s] || normalized.includes(synonymList[s])) {
          return i;
        }
      }
    }
    return -1;
  },

  /**
   * Scans the first 15 rows to find the actual header row with the highest matching column score.
   */
  findHeaderRow(rows) {
    if (!rows || rows.length === 0) return 0;
    const maxScan = Math.min(15, rows.length);
    let bestRowIdx = 0;
    let maxScore = -1;

    for (let r = 0; r < maxScan; r++) {
      const row = rows[r];
      if (!Array.isArray(row) || row.length === 0) continue;
      const headers = row.map((h) => String(h || "").trim());

      let score = 0;
      if (this.matchColumnIndex(headers, this.FIELD_SYNONYMS.studentId) !== -1) score += 3;
      if (this.matchColumnIndex(headers, this.FIELD_SYNONYMS.name) !== -1) score += 3;
      if (this.matchColumnIndex(headers, this.FIELD_SYNONYMS.combinedStudent) !== -1) score += 3;
      if (this.matchColumnIndex(headers, this.FIELD_SYNONYMS.program) !== -1) score += 2;
      if (this.matchColumnIndex(headers, this.FIELD_SYNONYMS.applyOn) !== -1) score += 2;
      if (this.matchColumnIndex(headers, this.FIELD_SYNONYMS.status) !== -1) score += 1;
      if (this.matchColumnIndex(headers, this.FIELD_SYNONYMS.institute) !== -1) score += 1;

      if (score > maxScore) {
        maxScore = score;
        bestRowIdx = r;
      }
    }

    return bestRowIdx;
  },

  /**
   * Processes a loaded SheetJS workbook object and extracts student records and diagnostic metrics.
   */
  processWorkbook(workbook) {
    // Find the first sheet that contains data
    let worksheet = null;
    let activeSheetName = "";
    for (const sheetName of workbook.SheetNames) {
      const ws = workbook.Sheets[sheetName];
      if (ws && ws["!ref"]) {
        worksheet = ws;
        activeSheetName = sheetName;
        break;
      }
    }

    if (!worksheet) {
      throw new Error("Uploaded Excel workbook is empty or has no readable sheets.");
    }

    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    if (!rows || rows.length < 2) {
      throw new Error("Uploaded Excel worksheet contains no data rows.");
    }

    // Discover header row dynamically
    const headerRowIdx = this.findHeaderRow(rows);
    const headers = rows[headerRowIdx].map((h) => String(h || "").trim());

    // Detect column indexes
    let idCol = this.matchColumnIndex(headers, this.FIELD_SYNONYMS.studentId);
    let nameCol = this.matchColumnIndex(headers, this.FIELD_SYNONYMS.name);
    const combinedCol = this.matchColumnIndex(headers, this.FIELD_SYNONYMS.combinedStudent);
    const progCol = this.matchColumnIndex(headers, this.FIELD_SYNONYMS.program);
    const applyCol = this.matchColumnIndex(headers, this.FIELD_SYNONYMS.applyOn);
    const statusCol = this.matchColumnIndex(headers, this.FIELD_SYNONYMS.status);
    const instCol = this.matchColumnIndex(headers, this.FIELD_SYNONYMS.institute);

    // Validate that we can extract student identification
    const hasSeparateCols = idCol !== -1 && nameCol !== -1;
    const hasCombinedCol = combinedCol !== -1;
    const hasOnlyIdCol = idCol !== -1 && nameCol === -1;

    if (!hasSeparateCols && !hasCombinedCol && !hasOnlyIdCol) {
      throw new Error(
        "Could not detect student identification columns. Please ensure your sheet includes 'Student ID' and 'Name', or a combined 'Student' column."
      );
    }

    const parsedRows = [];
    const invalidRows = [];
    const seenIds = new Set();
    const duplicateIds = new Set();

    let missingIdCount = 0;
    let missingNameCount = 0;
    let missingProgCount = 0;
    let missingDateCount = 0;
    let invalidCount = 0;

    const dataStartRow = headerRowIdx + 1;

    for (let r = dataStartRow; r < rows.length; r++) {
      const row = rows[r];
      const isBlankRow =
        !row ||
        row.length === 0 ||
        row.every((c) => c === null || c === undefined || String(c).trim() === "");

      if (isBlankRow) {
        invalidCount++;
        invalidRows.push({
          excelRow: r + 1,
          reason: "Blank or empty row",
          rawData: row
        });
        continue;
      }

      let studentId = "";
      let name = "";

      if (hasSeparateCols) {
        studentId = String(row[idCol] || "").trim();
        name = String(row[nameCol] || "").trim();
        // Fallback: If idCol contains combined "ID - Name" and name is empty
        if ((!name || name.length === 0) && studentId.includes(" - ")) {
          const split = splitCombinedStudent(studentId);
          studentId = split.studentId;
          name = split.name;
        }
      } else if (hasCombinedCol) {
        const rawStudent = String(row[combinedCol] || "").trim();
        const split = splitCombinedStudent(rawStudent);
        studentId = split.studentId;
        name = split.name;
      } else if (hasOnlyIdCol) {
        const rawVal = String(row[idCol] || "").trim();
        const split = splitCombinedStudent(rawVal);
        studentId = split.studentId;
        name = split.name || "Student";
      }

      // Check required fields
      if (!studentId) {
        missingIdCount++;
        invalidCount++;
        invalidRows.push({
          excelRow: r + 1,
          reason: "Missing Student ID",
          rawData: row
        });
        continue;
      }

      if (!name) {
        missingNameCount++;
        invalidCount++;
        invalidRows.push({
          excelRow: r + 1,
          reason: "Missing Student Name",
          rawData: row
        });
        continue;
      }

      // Program check
      const rawProg = progCol !== -1 ? String(row[progCol] || "").trim() : "";
      if (!rawProg) {
        missingProgCount++;
      }
      const program = rawProg || "General";

      // Application date check
      const rawApply = applyCol !== -1 ? row[applyCol] : "";
      const parsedDate = parseExcelDate(rawApply);
      if (!parsedDate) {
        missingDateCount++;
      }
      const applyOn = parsedDate || todayYYYYMMDD();

      // Additional metadata (status and institute)
      const rawStatus = statusCol !== -1 ? String(row[statusCol] || "").trim() : "";
      const institute = instCol !== -1 ? String(row[instCol] || "").trim() : "";

      // Duplicate detection within the incoming file
      const idKey = studentId.toLowerCase();
      if (seenIds.has(idKey)) {
        duplicateIds.add(studentId);
      } else {
        seenIds.add(idKey);
      }

      parsedRows.push({
        excelRow: r + 1,
        studentId,
        name,
        program,
        applyOn,
        rawStatus,
        institute
      });
    }

    const totalDataRows = rows.length - dataStartRow;

    return {
      sheetName: activeSheetName,
      headers,
      headerRow: headerRowIdx + 1,
      totalRows: totalDataRows,
      validCount: parsedRows.length,
      invalidCount,
      duplicateCount: duplicateIds.size,
      duplicateIds: Array.from(duplicateIds),
      missingIdCount,
      missingNameCount,
      missingProgCount,
      missingDateCount,
      rows: parsedRows,
      invalidRows
    };
  },

  /**
   * Parses an Excel file (browser File object, ArrayBuffer, or Uint8Array) into structured student records.
   */
  parseExcelFile(file) {
    return new Promise((resolve, reject) => {
      // Support buffer/Uint8Array/ArrayBuffer for direct in-memory parsing
      if (file instanceof Uint8Array || (typeof Buffer !== "undefined" && Buffer.isBuffer(file))) {
        try {
          const workbook = XLSX.read(file, { type: "buffer", cellDates: false });
          resolve(this.processWorkbook(workbook));
        } catch (err) {
          reject(new Error("Failed to parse Excel buffer: " + err.message));
        }
        return;
      }

      if (file instanceof ArrayBuffer) {
        try {
          const data = new Uint8Array(file);
          const workbook = XLSX.read(data, { type: "array", cellDates: false });
          resolve(this.processWorkbook(workbook));
        } catch (err) {
          reject(new Error("Failed to parse Excel buffer: " + err.message));
        }
        return;
      }

      // Browser FileReader
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array", cellDates: false });
          resolve(this.processWorkbook(workbook));
        } catch (err) {
          reject(new Error("Failed to parse Excel file: " + err.message));
        }
      };
      reader.onerror = () => reject(new Error("File reading failed."));
      reader.readAsArrayBuffer(file);
    });
  },

  downloadSampleTemplate() {
    const wb = XLSX.utils.book_new();
    const data = [
      ["S.No", "Student ID", "Student Name", "Program", "Apply On Date", "Notes"],
      [1, "IU04-0122-0001", "Muhammad Ahmed", "BSCS", "2026-11-01", "Degree clearance completed"],
      [2, "IU04-0122-0002", "Ayesha Khan", "BBA", "2026-11-02", "Transcript request"],
      [3, "IU04-0122-0003", "Zainab Fatima", "BSSE", "2026-11-03", "Urgent degree delivery"],
      [4, "IU04-0122-0004", "Hamza Ali", "MBA", "2026-11-04", "Regular clearance"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 8 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 16 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, "Sample Student Template");
    XLSX.writeFile(wb, "CaseTrack_Student_Upload_Template.xlsx");
  },

  exportToExcel(students = [], stats = null) {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Executive Summary
    const summaryData = [
      ["CaseTrack - Student Case Management System"],
      ["Report Generated", formatTimestamp(new Date().toISOString())],
      ["Total Student Cases in Database", students.length],
      [""],
      ["Stage", "Count", "Percentage"],
      ["Pending Cases", stats?.counts?.pending || 0, stats?.counts?.total ? ((stats.counts.pending / stats.counts.total) * 100).toFixed(1) + "%" : "0%"],
      ["Case Ready Queue", stats?.counts?.ready || 0, stats?.counts?.total ? ((stats.counts.ready / stats.counts.total) * 100).toFixed(1) + "%" : "0%"],
      ["Sent to Main Campus", stats?.counts?.sent || 0, stats?.counts?.total ? ((stats.counts.sent / stats.counts.total) * 100).toFixed(1) + "%" : "0%"],
      ["Returned from Main Campus", stats?.counts?.returned || 0, stats?.counts?.total ? ((stats.counts.returned / stats.counts.total) * 100).toFixed(1) + "%" : "0%"],
      ["Received & Completed", stats?.counts?.received || 0, stats?.counts?.total ? ((stats.counts.received / stats.counts.total) * 100).toFixed(1) + "%" : "0%"],
      [""],
      ["Completion Rate", stats?.completionRate || "--"],
      ["Average Turnaround Time", stats?.avgTurnaround || "--"],
      ["Cumulative Returns Logged", stats?.counts?.totalReturnsLogged || 0]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Overview Summary");

    // Sheet 2: All Students
    const allHeaders = ["S.No", "Student ID", "Name", "Program", "Apply On", "Current Status", "Case Ready Date", "Latest Sent Date", "Dispatch Count", "Latest Return Date", "Latest Return Reason", "Received Date"];
    const allRows = students.map((s) => {
      const latestSend = WorkflowService.getLatestSendEntry(s);
      const latestRet = WorkflowService.getLatestReturnEntry(s);
      return [
        s.serialNumber,
        s.studentId,
        s.name,
        s.program,
        formatDateOnly(s.applyOn),
        s.status,
        s.caseReady ? formatTimestamp(s.caseReady) : "--",
        latestSend?.sentAt ? formatTimestamp(latestSend.sentAt) : "--",
        s.sendHistory?.length || 0,
        latestRet?.returnedAt ? formatTimestamp(latestRet.returnedAt) : "--",
        latestRet?.returnReason || "--",
        s.received ? formatTimestamp(s.received) : "--"
      ];
    });
    const wsAll = XLSX.utils.aoa_to_sheet([allHeaders, ...allRows]);
    wsAll["!cols"] = [{ wch: 8 }, { wch: 18 }, { wch: 25 }, { wch: 14 }, { wch: 15 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 22 }, { wch: 35 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsAll, "All Students");

    // Helper for stage sheet
    const addStageSheet = (sheetName, filterFn, specificHeader, rowMapper) => {
      const filtered = students.filter(filterFn);
      const rows = filtered.map(rowMapper);
      const ws = XLSX.utils.aoa_to_sheet([specificHeader, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    };

    // Sheet 3: Pending
    addStageSheet(
      "Pending Cases",
      (s) => s.status === "Pending",
      ["S.No", "Student ID", "Name", "Program", "Apply On Date", "Status"],
      (s) => [s.serialNumber, s.studentId, s.name, s.program, formatDateOnly(s.applyOn), s.status]
    );

    // Sheet 4: Case Ready
    addStageSheet(
      "Case Ready",
      (s) => s.status === "Case Ready",
      ["S.No", "Student ID", "Name", "Program", "Apply On Date", "Case Ready Timestamp", "Status"],
      (s) => [s.serialNumber, s.studentId, s.name, s.program, formatDateOnly(s.applyOn), formatTimestamp(s.caseReady), s.status]
    );

    // Sheet 5: Sent to Main Campus
    addStageSheet(
      "Sent to Main Campus",
      (s) => s.status === "Sent to Main Campus",
      ["S.No", "Student ID", "Name", "Program", "Apply On Date", "Dispatched At", "Dispatch Attempt", "Operator"],
      (s) => {
        const latest = WorkflowService.getLatestSendEntry(s);
        return [
          s.serialNumber,
          s.studentId,
          s.name,
          s.program,
          formatDateOnly(s.applyOn),
          latest?.sentAt ? formatTimestamp(latest.sentAt) : "--",
          `#${s.sendHistory?.length || 1}`,
          latest?.operator || "Admin Officer"
        ];
      }
    );

    // Sheet 6: Returned Cases
    addStageSheet(
      "Returned Cases",
      (s) => s.status === "Returned from Main Campus",
      ["S.No", "Student ID", "Name", "Program", "Apply On Date", "Returned At", "Return Count", "Mandatory Return Reason"],
      (s) => {
        const latestRet = WorkflowService.getLatestReturnEntry(s);
        return [
          s.serialNumber,
          s.studentId,
          s.name,
          s.program,
          formatDateOnly(s.applyOn),
          latestRet?.returnedAt ? formatTimestamp(latestRet.returnedAt) : "--",
          `#${WorkflowService.getReturnCount(s)}`,
          latestRet?.returnReason || "No reason recorded"
        ];
      }
    );

    // Sheet 7: Received Cases
    addStageSheet(
      "Received Cases",
      (s) => s.status === "Received from Main Campus",
      ["S.No", "Student ID", "Name", "Program", "Apply On Date", "Sent Date", "Received / Degree Issued At", "Status"],
      (s) => {
        const latestSend = WorkflowService.getLatestSendEntry(s);
        return [
          s.serialNumber,
          s.studentId,
          s.name,
          s.program,
          formatDateOnly(s.applyOn),
          latestSend?.sentAt ? formatTimestamp(latestSend.sentAt) : "--",
          formatTimestamp(s.received),
          s.status
        ];
      }
    );

    const nowStr = todayYYYYMMDD();
    XLSX.writeFile(wb, `CaseTrack_Student_Export_${nowStr}.xlsx`);
  },

  exportHistoryToExcel(events = []) {
    const wb = XLSX.utils.book_new();
    const headers = ["Timestamp", "Action", "Student ID", "Student Name", "Program", "Operator", "Details & Reason"];
    const rows = events.map((ev) => [
      formatTimestamp(ev.timestamp),
      ev.action || "--",
      ev.studentId || "--",
      ev.studentName || "--",
      ev.program || "--",
      ev.operator || "--",
      ev.details || ev.reason || "--"
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = [{ wch: 22 }, { wch: 25 }, { wch: 18 }, { wch: 25 }, { wch: 14 }, { wch: 18 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, ws, "Activity Audit Log");
    const nowStr = todayYYYYMMDD();
    XLSX.writeFile(wb, `CaseTrack_Activity_History_${nowStr}.xlsx`);
  }
};
