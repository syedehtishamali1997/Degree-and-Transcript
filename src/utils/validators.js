/**
 * validators.js
 * Form and input validation helpers.
 */

export function validateStudentInput(student, existingStudents = [], recordId = null) {
  const errors = [];
  const studentId = String(student.studentId || "").trim();
  const name = String(student.name || "").trim();
  const program = String(student.program || "").trim();
  const applyOn = String(student.applyOn || "").trim();

  if (!studentId) {
    errors.push("Student ID is required.");
  } else {
    const duplicate = existingStudents.find(
      (s) => s.id !== recordId && s.studentId.trim().toLowerCase() === studentId.toLowerCase()
    );
    if (duplicate) {
      errors.push(`Student ID '${studentId}' already exists in the database.`);
    }
  }

  if (!name) {
    errors.push("Student Name is required.");
  } else if (name.length < 2) {
    errors.push("Student Name must be at least 2 characters.");
  }

  if (!program) {
    errors.push("Degree Program is required.");
  }

  if (!applyOn) {
    errors.push("Apply On date is required.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateReturnReason(reason) {
  const str = String(reason || "").trim();
  if (!str) {
    return { valid: false, error: "Return reason cannot be empty or whitespace." };
  }
  if (str.length < 5) {
    return { valid: false, error: "Please enter a detailed return reason (at least 5 characters)." };
  }
  return { valid: true, reason: str };
}
