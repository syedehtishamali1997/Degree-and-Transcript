/**
 * WorkflowService.js
 * Enforces the 4-stage sequential state machine and business rules.
 */

import { nowLocalISO, parseToYYYYMMDD, todayYYYYMMDD } from "../utils/dateUtils.js";
import { generateId } from "../utils/formatters.js";

export const STATUS = {
  PENDING: "Pending",
  READY: "Case Ready",
  SENT: "Sent to Main Campus",
  RETURNED: "Returned from Main Campus",
  RECEIVED: "Received from Main Campus"
};

export const DOCUMENT_STATUS = {
  NOT_UPLOADED: "Not Uploaded",
  PARTIALLY_UPLOADED: "Partially Uploaded",
  INCOMPLETE: "Incomplete",
  UPLOADED: "Uploaded",
  DOCS_UPLOADED: "Documents Uploaded",
  SUBMITTED: "Submitted",
  READY: "Ready for Processing"
};

export const WorkflowService = {
  getLatestSendEntry(student) {
    if (!student || !Array.isArray(student.sendHistory) || student.sendHistory.length === 0) {
      return null;
    }
    return student.sendHistory[student.sendHistory.length - 1];
  },

  getLatestReturnEntry(student) {
    if (!student || !Array.isArray(student.sendHistory) || student.sendHistory.length === 0) {
      return null;
    }
    for (let i = student.sendHistory.length - 1; i >= 0; i--) {
      if (student.sendHistory[i].returnedAt) {
        return student.sendHistory[i];
      }
    }
    return null;
  },

  getReturnCount(student) {
    if (!student || !Array.isArray(student.sendHistory)) return 0;
    return student.sendHistory.filter((entry) => Boolean(entry.returnedAt)).length;
  },

  canMarkReady(student) {
    if (!student || student.status !== STATUS.PENDING || student.caseReady !== null) return false;
    // Essential validations: Student ID and Student Name are required.
    // Document upload is OPTIONAL: an admin may mark ready with or without uploaded documents.
    const hasValidId = Boolean(student.studentId && String(student.studentId).trim());
    const hasValidName = Boolean(student.name && String(student.name).trim());
    return hasValidId && hasValidName;
  },

  canSendInitial(student) {
    return Boolean(
      student &&
        student.status === STATUS.READY &&
        student.caseReady !== null &&
        student.received === null &&
        student.sendHistory.length === 0
    );
  },

  canReturnCase(student) {
    if (!student || student.status !== STATUS.SENT || student.received !== null) return false;
    const latest = this.getLatestSendEntry(student);
    return Boolean(latest && latest.sentAt && latest.returnedAt === null);
  },

  canResendCase(student) {
    if (!student || student.status !== STATUS.RETURNED || student.received !== null) return false;
    if (!student.caseReady) return false;
    const latest = this.getLatestSendEntry(student);
    return Boolean(latest && latest.sentAt && latest.returnedAt !== null);
  },

  canMarkReceived(student) {
    if (!student || student.status !== STATUS.SENT || student.received !== null) return false;
    if (!student.caseReady) return false;
    const latest = this.getLatestSendEntry(student);
    return Boolean(latest && latest.sentAt && latest.returnedAt === null);
  },

  canDeleteStudent(student) {
    return Boolean(
      student &&
        student.status === STATUS.PENDING &&
        student.caseReady === null &&
        (!student.sendHistory || student.sendHistory.length === 0) &&
        student.received === null
    );
  },

  markCaseReady(student, operatorName = "Admin Officer", force = false) {
    if (!student) return { ok: false, error: "Student record not found." };
    if (student.status !== STATUS.PENDING) {
      return { ok: false, error: `Cannot mark Case Ready while status is '${student.status}'.` };
    }
    if (!force && !this.canMarkReady(student)) {
      return {
        ok: false,
        error: "Cannot mark Case Ready. Valid Student ID and Student Name are required."
      };
    }

    const now = nowLocalISO();
    const updated = {
      ...student,
      caseReady: now,
      status: STATUS.READY,
      updatedAt: now,
      activityHistory: [
        ...(student.activityHistory || []),
        {
          action: "Case Ready",
          timestamp: now,
          operator: operatorName,
          description: "Case marked ready for dispatch to Main Campus."
        }
      ]
    };

    return { ok: true, student: updated };
  },

  sendToMainCampus(student, operatorName = "Admin Officer", notes = "") {
    if (!student) return { ok: false, error: "Student record not found." };
    if (student.received !== null || student.status === STATUS.RECEIVED) {
      return { ok: false, error: "Completed cases cannot be sent again." };
    }
    if (student.status === STATUS.SENT) {
      return { ok: false, error: "Case is already sent to Main Campus and awaiting receipt or return." };
    }

    const isResend = student.status === STATUS.RETURNED && student.sendHistory.length > 0;
    if (!isResend && !this.canSendInitial(student)) {
      return { ok: false, error: "Invalid workflow state for sending case." };
    }
    if (isResend && !this.canResendCase(student)) {
      return { ok: false, error: "Previous send entry must be returned before resending." };
    }

    const now = nowLocalISO();
    const attemptNo = (student.sendHistory?.length || 0) + 1;
    const newSendEntry = {
      sentAt: now,
      operator: operatorName,
      notes: notes || (isResend ? `Resent to Main Campus (Attempt #${attemptNo})` : "Initial dispatch to Main Campus"),
      returnedAt: null,
      returnReason: null
    };

    const updated = {
      ...student,
      status: STATUS.SENT,
      updatedAt: now,
      sendHistory: [...(student.sendHistory || []), newSendEntry],
      activityHistory: [
        ...(student.activityHistory || []),
        {
          action: isResend ? "Sent to Main Campus Again" : "Sent to Main Campus",
          timestamp: now,
          operator: operatorName,
          description: isResend
            ? `Case resent to Main Campus (Attempt #${attemptNo}).`
            : "Case sent to Main Campus (Attempt #1)."
        }
      ]
    };

    return { ok: true, student: updated, isResend, attemptNo };
  },

  returnCase(student, rawReason, operatorName = "Admin Officer") {
    if (!student) return { ok: false, error: "Student record not found." };
    if (student.received !== null || student.status === STATUS.RECEIVED) {
      return { ok: false, error: "Completed (Received) cases cannot be returned." };
    }
    if (!this.canReturnCase(student)) {
      return { ok: false, error: "Only cases currently 'Sent to Main Campus' can be returned." };
    }

    const reason = typeof rawReason === "string" ? rawReason.trim() : "";
    if (!reason || reason.length < 5) {
      return { ok: false, error: "A detailed return reason (at least 5 characters) is mandatory." };
    }

    const now = nowLocalISO();
    const sendHistory = (student.sendHistory || []).map((entry, idx, arr) => {
      if (idx === arr.length - 1) {
        return {
          ...entry,
          returnedAt: now,
          returnReason: reason
        };
      }
      return entry;
    });

    const attemptNo = sendHistory.length;
    const updated = {
      ...student,
      status: STATUS.RETURNED,
      updatedAt: now,
      sendHistory,
      activityHistory: [
        ...(student.activityHistory || []),
        {
          action: "Returned from Main Campus",
          timestamp: now,
          operator: operatorName,
          description: `Case returned from Main Campus (Dispatch Attempt #${attemptNo}).`,
          reason
        }
      ]
    };

    return { ok: true, student: updated, reason };
  },

  markReceived(student, operatorName = "Admin Officer") {
    if (!student) return { ok: false, error: "Student record not found." };
    if (student.received !== null || student.status === STATUS.RECEIVED) {
      return { ok: false, error: "Case is already marked Received and permanently locked." };
    }
    if (!this.canMarkReceived(student)) {
      return { ok: false, error: "Case must currently be 'Sent to Main Campus' before marking Received." };
    }

    const now = nowLocalISO();
    const updated = {
      ...student,
      received: now,
      status: STATUS.RECEIVED,
      updatedAt: now,
      activityHistory: [
        ...(student.activityHistory || []),
        {
          action: "Received from Main Campus",
          timestamp: now,
          operator: operatorName,
          description: "Case received from Main Campus and permanently completed (Degree issued)."
        }
      ]
    };

    return { ok: true, student: updated };
  },

  createStudent(data, existingStudents = [], operatorName = "Admin Officer") {
    const cleanId = String(data.studentId || "").trim();
    if (!cleanId) {
      throw new Error("Student ID is required.");
    }
    const duplicate = existingStudents.some(
      (s) => s.studentId && s.studentId.trim().toLowerCase() === cleanId.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`Student ID '${cleanId}' already exists in database.`);
    }

    const nextSno = existingStudents.reduce((max, s) => Math.max(max, Number(s.serialNumber) || 0), 0) + 1;
    const now = nowLocalISO();

    const student = {
      id: generateId(),
      serialNumber: nextSno,
      studentId: cleanId,
      name: String(data.name || "").trim(),
      program: String(data.program || "").trim(),
      programFull: data.programFull ? String(data.programFull).trim() : null,
      approvedDepartments: data.approvedDepartments ? String(data.approvedDepartments).trim() : null,
      applyOn: parseToYYYYMMDD(data.applyOn) || todayYYYYMMDD(),
      status: STATUS.PENDING,
      documentStatus: data.documentStatus || DOCUMENT_STATUS.NOT_UPLOADED,
      documentFolder: data.documentFolder || null,
      documentSubmittedAt: data.documentSubmittedAt || null,
      finalPdfUrl: data.finalPdfUrl || null,
      documentsList: Array.isArray(data.documentsList) ? data.documentsList : [],
      caseReady: null,
      sendHistory: [],
      received: null,
      activityHistory: [
        {
          action: "Record Created",
          timestamp: now,
          operator: operatorName,
          description: "Student record registered in campus database."
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    return student;
  },

  updateStudentDocuments(student, uploadResult = {}, operatorName = "Admin Officer") {
    const now = nowLocalISO();
    return {
      ...student,
      documentStatus: uploadResult.documentStatus || DOCUMENT_STATUS.SUBMITTED,
      documentFolder: uploadResult.folderName || student.documentFolder,
      documentSubmittedAt: uploadResult.documentSubmittedAt || now,
      finalPdfUrl: uploadResult.finalPdfUrl || student.finalPdfUrl,
      documentsList: uploadResult.documents || student.documentsList || [],
      updatedAt: now,
      activityHistory: [
        ...(student.activityHistory || []),
        {
          action: "Documents Submitted",
          timestamp: now,
          operator: operatorName,
          description: `All mandatory transcripts and academic certificates uploaded and consolidated into PDF (${uploadResult.documents?.length || 0} files).`
        }
      ]
    };
  },

  updateStudentInfo(student, data, operatorName = "Admin Officer") {
    const now = nowLocalISO();
    return {
      ...student,
      name: String(data.name || "").trim(),
      program: String(data.program || "").trim(),
      programFull: data.programFull ? String(data.programFull).trim() : student.programFull,
      approvedDepartments: data.approvedDepartments ? String(data.approvedDepartments).trim() : student.approvedDepartments,
      applyOn: parseToYYYYMMDD(data.applyOn) || student.applyOn,
      updatedAt: now,
      activityHistory: [
        ...(student.activityHistory || []),
        {
          action: "Record Updated",
          timestamp: now,
          operator: operatorName,
          description: "Student demographic / program details updated."
        }
      ]
    };
  }
};
