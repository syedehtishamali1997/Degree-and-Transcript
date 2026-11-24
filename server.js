/**
 * server.js
 * Production Express backend for CaseTrack Student Document Management & Storage.
 * Handles folder creation, file uploads, magic byte validation, and PDF consolidation.
 */

import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import {
  DOCUMENTS_DIR,
  ensureStudentFolder,
  getStudentDocumentsMetadata,
  generateConsolidatedPdf,
  validateFileMagicBytes,
  sanitizeFolderName,
  deleteStudentFolder,
  clearAllStudentFolders
} from "./server/documentService.js";
import {
  TARGET_STORAGE_CAPACITY_BYTES,
  TARGET_STORAGE_CAPACITY_GB,
  getStorageMetrics,
  checkStorageAvailable,
  saveDatabaseToServer,
  loadDatabaseFromServer,
  listServerBackups,
  restoreServerBackup,
  formatBytes,
  BACKUPS_DIR,
  DATA_DIR
} from "./server/storageService.js";
import {
  initializeAuthStore,
  authenticateUser,
  createSession,
  verifySessionToken,
  destroySession,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  listRoles,
  readRolesFromDisk,
  writeRolesToDisk,
  getRolePermissions,
  hasPermission,
  logAuthAudit
} from "./server/authService.js";

// Initialize Authentication & RBAC Store (seeded with Super Admin, Officer, Registrar, Viewer)
initializeAuthStore();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
// Upgraded Express body parsing limits to support enterprise 100 GB architecture & large JSON sync
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Configure Multer for in-memory file buffering with enterprise 100 MB per-file upload limit
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100 MB max per file (upgraded from 25 MB)
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "CaseTrack Document Server", timestamp: new Date().toISOString() });
});

/**
 * POST /api/students/init-folder
 * Initializes folder structure for a student
 */
app.post("/api/students/init-folder", (req, res) => {
  try {
    const { studentId, name, program, applyOn, notes, approvedDepartments } = req.body;
    if (!studentId || !name) {
      return res.status(400).json({ ok: false, error: "studentId and name are required." });
    }

    const folderResult = ensureStudentFolder(studentId, name, {
      studentId,
      name,
      program,
      applyOn,
      notes,
      approvedDepartments
    });

    res.json({
      ok: true,
      folderName: folderResult.folderName,
      info: folderResult.info
    });
  } catch (err) {
    console.error("Error in /api/students/init-folder:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/students/init-folders-bulk
 * Bulk folder creation for Excel imported students
 */
app.post("/api/students/init-folders-bulk", (req, res) => {
  try {
    const { students = [] } = req.body;
    let created = 0;

    students.forEach((s) => {
      if (s.studentId && s.name) {
        ensureStudentFolder(s.studentId, s.name, s);
        created++;
      }
    });

    res.json({ ok: true, count: created });
  } catch (err) {
    console.error("Error in /api/students/init-folders-bulk:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/documents/:studentId
 * Retrieve metadata, uploaded documents list, and final PDF status
 */
app.get("/api/documents/:studentId", (req, res) => {
  try {
    const { studentId } = req.params;
    const cleanId = String(studentId).trim().replace(/[^a-zA-Z0-9_-]/g, "_");

    // Locate matching folder
    const baseDir = path.resolve(process.cwd(), "documents");
    if (!fs.existsSync(baseDir)) {
      return res.json({ ok: true, found: false, documents: [] });
    }

    const folders = fs.readdirSync(baseDir);
    let matchedFolder = null;
    for (const f of folders) {
      if (f.toLowerCase().startsWith(cleanId.toLowerCase() + "_")) {
        matchedFolder = f;
        break;
      }
    }

    if (!matchedFolder) {
      return res.json({ ok: true, found: false, documents: [] });
    }

    const meta = getStudentDocumentsMetadata(matchedFolder);
    res.json({ ok: true, found: true, ...meta });
  } catch (err) {
    console.error("Error in GET /api/documents/:studentId:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/documents/:studentId/upload
 * Multi-step document upload and PDF consolidation endpoint
 */
app.post(
  "/api/documents/:studentId/upload",
  upload.fields([
    { name: "edpTranscript", maxCount: 1 },
    { name: "examTranscript", maxCount: 1 },
    { name: "matricMarkSheet", maxCount: 1 },
    { name: "matricCertificate", maxCount: 1 },
    { name: "interMarkSheet", maxCount: 1 },
    { name: "interCertificate", maxCount: 1 },
    { name: "gradMarkSheet", maxCount: 1 },
    { name: "degree", maxCount: 1 },
    { name: "additionalDegrees", maxCount: 10 }
  ]),
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const studentName = req.body.studentName || "student";
      let studentInfo = {};
      try {
        if (req.body.studentInfo) {
          studentInfo = JSON.parse(req.body.studentInfo);
        }
      } catch {
        studentInfo = {};
      }

      let additionalDegreesMeta = [];
      try {
        if (req.body.additionalDegreesMeta) {
          additionalDegreesMeta = JSON.parse(req.body.additionalDegreesMeta);
        }
      } catch {
        additionalDegreesMeta = [];
      }

      // Pre-check storage capacity before saving any files (100 GB architecture enforcement)
      const files = req.files || {};
      let incomingUploadBytes = 0;
      Object.keys(files).forEach((key) => {
        (files[key] || []).forEach((f) => {
          incomingUploadBytes += (f.size || (f.buffer ? f.buffer.length : 0));
        });
      });

      const capacityCheck = checkStorageAvailable(incomingUploadBytes);
      if (!capacityCheck.ok) {
        return res.status(507).json({ ok: false, error: capacityCheck.error });
      }

      // Ensure student folders exist
      const folderData = ensureStudentFolder(studentId, studentName, studentInfo);
      const { folderName, transcriptsPath, academicPath, additionalDegreesPath } = folderData;

      const orderedDocList = [];

      // Helper to process and save a document file
      const processField = (fieldKey, destDir, targetBaseName, isPdfOnly = false) => {
        if (files[fieldKey] && files[fieldKey][0]) {
          const file = files[fieldKey][0];
          // Validate content
          const isValidMagic = validateFileMagicBytes(file.buffer);
          if (!isValidMagic) {
            throw new Error(`Invalid file content for ${fieldKey}. File content does not match allowed types.`);
          }

          const ext = path.extname(file.originalname).toLowerCase();
          if (isPdfOnly && ext !== ".pdf") {
            throw new Error(`${fieldKey} must be a PDF file.`);
          }

          const targetFileName = `${targetBaseName}${ext}`;
          const targetPath = path.join(destDir, targetFileName);
          fs.writeFileSync(targetPath, file.buffer);

          return { fieldKey, filePath: targetPath, originalName: file.originalname };
        } else {
          // If no new file uploaded, check if existing file is already present
          if (fs.existsSync(destDir)) {
            const existingFiles = fs.readdirSync(destDir);
            for (const f of existingFiles) {
              if (f.startsWith(targetBaseName + ".")) {
                return { fieldKey, filePath: path.join(destDir, f), originalName: f };
              }
            }
          }
        }
        return null;
      };

      // 1. EDP Transcript (PDF only, mandatory)
      const edp = processField("edpTranscript", transcriptsPath, "EDP_Transcript", true);
      if (edp) orderedDocList.push(edp);

      // 2. Exam Transcript (PDF only, mandatory)
      const exam = processField("examTranscript", transcriptsPath, "Exam_Transcript", true);
      if (exam) orderedDocList.push(exam);

      // 3. Matric Mark Sheet
      const mms = processField("matricMarkSheet", academicPath, "Matric_Mark_Sheet");
      if (mms) orderedDocList.push(mms);

      // 4. Matric Board Certificate
      const mbc = processField("matricCertificate", academicPath, "Matric_Board_Certificate");
      if (mbc) orderedDocList.push(mbc);

      // 5. Intermediate Mark Sheet
      const ims = processField("interMarkSheet", academicPath, "Intermediate_Mark_Sheet");
      if (ims) orderedDocList.push(ims);

      // 6. Intermediate Provisional Board Certificate
      const ipc = processField("interCertificate", academicPath, "Intermediate_Provisional_Certificate");
      if (ipc) orderedDocList.push(ipc);

      // 7. Graduation Mark Sheet
      const gms = processField("gradMarkSheet", academicPath, "Graduation_Mark_Sheet");
      if (gms) orderedDocList.push(gms);

      // 8. Degree
      const deg = processField("degree", academicPath, "Degree");
      if (deg) orderedDocList.push(deg);

      // 9. Additional Degrees
      const uploadedAddFiles = files.additionalDegrees || [];
      uploadedAddFiles.forEach((file, idx) => {
        const meta = additionalDegreesMeta[idx] || {};
        const degreeNameClean = String(meta.name || `Additional_Degree_${idx + 1}`)
          .trim()
          .replace(/[^a-zA-Z0-9_-]/g, "_");
        const ext = path.extname(file.originalname).toLowerCase();
        const targetFileName = `${degreeNameClean}_${Date.now()}${ext}`;
        const targetPath = path.join(additionalDegreesPath, targetFileName);
        fs.writeFileSync(targetPath, file.buffer);

        orderedDocList.push({
          fieldKey: "additional_degree",
          degreeName: meta.name || "Additional Degree",
          isAdditionalDegree: true,
          filePath: targetPath,
          originalName: file.originalname
        });
      });

      // Also gather any previously uploaded additional degrees if not re-uploaded
      if (uploadedAddFiles.length === 0 && fs.existsSync(additionalDegreesPath)) {
        const existingAdds = fs.readdirSync(additionalDegreesPath);
        existingAdds.forEach((f) => {
          const fullPath = path.join(additionalDegreesPath, f);
          if (fs.statSync(fullPath).isFile()) {
            orderedDocList.push({
              fieldKey: "additional_degree",
              degreeName: f.replace(/_\d+\.[^/.]+$/, "").replace(/_/g, " "),
              isAdditionalDegree: true,
              filePath: fullPath,
              originalName: f
            });
          }
        });
      }

      // Generate the single consolidated PDF!
      const pdfResult = await generateConsolidatedPdf(folderName, orderedDocList);

      // Update student_information.json
      const infoFilePath = path.join(folderData.folderPath, "student_information.json");
      const currentInfo = JSON.parse(fs.readFileSync(infoFilePath, "utf8"));
      currentInfo.documentStatus = "Submitted";
      currentInfo.documentSubmittedAt = new Date().toISOString();
      currentInfo.finalPdfPages = pdfResult.pageCount;
      currentInfo.finalPdfSizeBytes = pdfResult.fileSizeBytes;
      fs.writeFileSync(infoFilePath, JSON.stringify(currentInfo, null, 2), "utf8");

      const meta = getStudentDocumentsMetadata(folderName);

      res.json({
        ok: true,
        message: "Documents uploaded and consolidated PDF generated successfully.",
        folderName,
        documentStatus: "Submitted",
        documentSubmittedAt: currentInfo.documentSubmittedAt,
        pdfResult,
        ...meta
      });
    } catch (err) {
      console.error("Error in POST /api/documents/:studentId/upload:", err);
      res.status(500).json({ ok: false, error: err.message });
    }
  }
);

/**
 * GET /api/documents/:folderName/file/:category/:filename
 * GET /api/documents/:folderName/file/:category/:subfolder/:filename
 * Serve individual files safely
 */
app.get("/api/documents/:folderName/file/*subpath", (req, res) => {
  try {
    const { folderName } = req.params;
    const subpath = req.params.subpath || (Array.isArray(req.params[0]) ? req.params[0].join("/") : req.params[0]);

    // Sanitize against directory traversal
    if (folderName.includes("..") || subpath.includes("..")) {
      return res.status(403).json({ error: "Access denied." });
    }

    const baseDir = path.resolve(process.cwd(), "documents");
    const targetPath = path.join(baseDir, folderName, subpath);

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: "File not found." });
    }

    res.sendFile(targetPath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/documents/:folderName/final-pdf
 * Download or stream the student's complete consolidated PDF
 */
app.get("/api/documents/:folderName/final-pdf", (req, res) => {
  try {
    const { folderName } = req.params;
    if (folderName.includes("..")) {
      return res.status(403).json({ error: "Access denied." });
    }

    const baseDir = path.resolve(process.cwd(), "documents");
    const targetPath = path.join(baseDir, folderName, "Final_Student_Document.pdf");

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: "Consolidated PDF not generated yet." });
    }

    const downloadName = `${folderName}_Complete_Documents.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${downloadName}"`);
    res.sendFile(targetPath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/documents/:folderName/print
 * Dedicated print view that opens the PDF in full page with print command
 */
app.get("/api/documents/:folderName/print", (req, res) => {
  try {
    const { folderName } = req.params;
    const pdfUrl = `/api/documents/${encodeURIComponent(folderName)}/final-pdf`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Print CaseTrack Document - ${folderName}</title>
  <style>
    body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #222; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <iframe id="pdfFrame" src="${pdfUrl}#toolbar=1&navpanes=0"></iframe>
  <script>
    const frame = document.getElementById('pdfFrame');
    frame.onload = function() {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch(e) {
        console.log('Direct print blocked by browser sandbox; use iframe toolbar print button.', e);
      }
    };
  </script>
</body>
</html>`;
    res.send(html);
  } catch (err) {
    res.status(500).send("Error generating print view.");
  }
});

/**
 * DELETE /api/students/:studentId/documents
 * Safely removes a specific student's physical document directory.
 */
app.delete("/api/students/:studentId/documents", (req, res) => {
  try {
    const { studentId } = req.params;
    const result = deleteStudentFolder(studentId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/students/cleanup-folders
 * Bulk removal of specific students' folders by student IDs.
 */
app.post("/api/students/cleanup-folders", (req, res) => {
  try {
    const { studentIds = [] } = req.body;
    let deletedCount = 0;
    studentIds.forEach((sid) => {
      const res = deleteStudentFolder(sid);
      if (res.ok && res.deleted) deletedCount++;
    });
    res.json({ ok: true, count: deletedCount });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/students/clear-all-folders
 * Removes all student folders under documents/ while keeping the directory intact.
 */
app.post("/api/students/clear-all-folders", (req, res) => {
  try {
    const result = clearAllStudentFolders();
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ======================================================================
// 100 GB ENTERPRISE STORAGE ARCHITECTURE & DATABASE SYNC ENDPOINTS
// ======================================================================

/**
 * GET /api/storage/metrics
 * Comprehensive live storage telemetry across physical drive, documents, database, and backups.
 */
app.get("/api/storage/metrics", (req, res) => {
  try {
    const metrics = getStorageMetrics();
    res.json(metrics);
  } catch (err) {
    console.error("Error in GET /api/storage/metrics:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/database
 * Loads server-persisted database JSON if it exists on disk.
 */
app.get("/api/database", (req, res) => {
  try {
    const db = loadDatabaseFromServer();
    if (!db) {
      return res.json({ ok: true, found: false, database: null });
    }
    res.json({ ok: true, found: true, database: db });
  } catch (err) {
    console.error("Error in GET /api/database:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/database/sync
 * Persists client database state to server disk (data/casetrack_database.json) with rotational backup.
 */
app.post("/api/database/sync", (req, res) => {
  try {
    const { database, createBackup = true } = req.body;
    if (!database || !Array.isArray(database.students)) {
      return res.status(400).json({ ok: false, error: "Invalid database structure: missing students array." });
    }

    const saveResult = saveDatabaseToServer(database, { createBackup });
    res.json({
      ok: true,
      message: "Database synchronized to server disk successfully.",
      ...saveResult
    });
  } catch (err) {
    console.error("Error in POST /api/database/sync:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/storage/backups
 * List all available server-side database backups.
 */
app.get("/api/storage/backups", (req, res) => {
  try {
    const backups = listServerBackups();
    res.json({ ok: true, backups });
  } catch (err) {
    console.error("Error in GET /api/storage/backups:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/storage/backups/restore
 * Restores a specific server-side backup into the active server database.
 */
app.post("/api/storage/backups/restore", (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ ok: false, error: "Missing filename parameter." });
    }

    const result = restoreServerBackup(filename);
    res.json({ ok: true, message: `Backup '${filename}' restored successfully.`, ...result });
  } catch (err) {
    console.error("Error in POST /api/storage/backups/restore:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/storage/backups/download/:filename
 * Download a specific server-side backup JSON file.
 */
app.get("/api/storage/backups/download/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    const backupPath = path.join(BACKUPS_DIR, safeFilename);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: "Backup file not found." });
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
    res.sendFile(backupPath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ======================================================================
// AUTHENTICATION, RBAC & USER MANAGEMENT ENDPOINTS
// ======================================================================

function extractToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  return req.headers["x-casetrack-token"] || req.query.token || null;
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ ok: false, error: "Authentication required. Please sign in." });
  }
  const sessionData = verifySessionToken(token);
  if (!sessionData) {
    return res.status(401).json({ ok: false, error: "Session expired or invalid. Please sign in again." });
  }
  req.user = sessionData.user;
  req.session = sessionData.session;
  next();
}

function requireSuperAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({ ok: false, error: "Forbidden: Super Admin authority required." });
    }
    next();
  });
}

/**
 * POST /api/auth/login
 * Authenticates user credentials via scrypt and creates an active session.
 */
app.post("/api/auth/login", (req, res) => {
  try {
    const identifier = req.body.usernameOrEmail || req.body.username || req.body.email;
    const { password, rememberMe = false } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ ok: false, error: "Username/email and password are required." });
    }

    const authResult = authenticateUser(identifier, password);
    if (!authResult.ok) {
      return res.status(401).json(authResult);
    }

    const session = createSession(authResult.user, rememberMe);
    const permissions = getRolePermissions(authResult.user.role);

    res.json({
      ok: true,
      user: authResult.user,
      token: session.token,
      expiresAt: session.expiresAt,
      permissions
    });
  } catch (err) {
    console.error("Error in /api/auth/login:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/auth/logout
 * Destroys session token.
 */
app.post("/api/auth/logout", (req, res) => {
  try {
    const token = extractToken(req) || req.body?.token;
    destroySession(token);
    res.json({ ok: true, message: "Logged out successfully." });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/auth/me
 * Retrieves currently authenticated user and active permissions.
 */
app.get("/api/auth/me", requireAuth, (req, res) => {
  try {
    const permissions = getRolePermissions(req.user.role);
    res.json({
      ok: true,
      user: req.user,
      permissions
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/users
 * Returns list of registered users (Super Admin or authorized officers).
 */
app.get("/api/users", requireAuth, (req, res) => {
  try {
    const users = listUsers();
    res.json({ ok: true, users });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/users
 * Creates a new user account with hashed password (Super Admin only).
 */
app.post("/api/users", requireSuperAdmin, (req, res) => {
  try {
    const newUser = createUser(req.body, req.user.username);
    res.status(201).json({ ok: true, user: newUser });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

/**
 * PUT /api/users/:id
 * Updates an existing user's information or role (Super Admin only).
 */
app.put("/api/users/:id", requireSuperAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const updated = updateUser(id, req.body, req.user.username);
    res.json({ ok: true, user: updated });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

/**
 * DELETE /api/users/:id
 * Deletes user account with safety guards (Super Admin only).
 */
app.delete("/api/users/:id", requireSuperAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const result = deleteUser(id, req.user.id, req.user.username);
    res.json(result);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/users/:id/reset-password
 * Resets user password securely (Super Admin only).
 */
app.post("/api/users/:id/reset-password", requireSuperAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ ok: false, error: "Password must be at least 6 characters long." });
    }
    const updated = updateUser(id, { password: newPassword }, req.user.username);
    res.json({ ok: true, message: "Password reset successfully.", user: updated });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/roles
 * Lists available roles and their permission matrices.
 */
app.get("/api/roles", requireAuth, (req, res) => {
  try {
    const roles = listRoles();
    res.json({ ok: true, roles });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * PUT /api/roles/:id/permissions
 * Updates permissions for a role (Super Admin only).
 */
app.put("/api/roles/:id/permissions", requireSuperAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ ok: false, error: "Permissions must be an array." });
    }
    const roles = readRolesFromDisk();
    const roleIdx = roles.findIndex((r) => r.id === id);
    if (roleIdx === -1) {
      return res.status(404).json({ ok: false, error: "Role not found." });
    }
    roles[roleIdx].permissions = permissions;
    writeRolesToDisk(roles);
    res.json({ ok: true, role: roles[roleIdx] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ======================================================================
// DYNAMIC BRANDING ENDPOINTS
// ======================================================================

const BRANDING_FILE = path.join(DATA_DIR, "branding.json");

/**
 * GET /api/branding
 * Retrieves dynamic branding settings.
 */
app.get("/api/branding", (req, res) => {
  try {
    if (fs.existsSync(BRANDING_FILE)) {
      const raw = fs.readFileSync(BRANDING_FILE, "utf8");
      return res.json({ ok: true, branding: JSON.parse(raw) });
    }
    res.json({
      ok: true,
      branding: {
        appName: "CaseTrack",
        campusSubtitle: "by Iqra University",
        logoType: "default",
        logoUrl: null
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/branding
 * Saves dynamic branding configuration.
 */
app.post("/api/branding", (req, res) => {
  try {
    const branding = (req.body && req.body.branding) ? req.body.branding : req.body;
    if (!branding || typeof branding !== "object" || Object.keys(branding).length === 0) {
      return res.status(400).json({ ok: false, error: "Invalid branding payload." });
    }
    const cleanBranding = {
      appName: String(branding.appName || "CaseTrack").trim(),
      campusSubtitle: String(branding.campusSubtitle || "by Iqra University").trim(),
      logoType: branding.logoType === "custom" && branding.logoUrl ? "custom" : "default",
      logoUrl: branding.logoUrl || null,
      faviconUrl: branding.faviconUrl || branding.logoUrl || null,
      updatedAt: new Date().toISOString()
    };
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(BRANDING_FILE, JSON.stringify(cleanBranding, null, 2), "utf8");
    res.json({ ok: true, branding: cleanBranding });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/branding/upload-logo
 * Uploads a custom branding logo image file.
 */
app.post("/api/branding/upload-logo", upload.single("logo"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No image file provided." });
    }

    const mime = req.file.mimetype;
    const base64Data = req.file.buffer.toString("base64");
    const dataUrl = `data:${mime};base64,${base64Data}`;

    res.json({
      ok: true,
      logoUrl: dataUrl,
      sizeBytes: req.file.size,
      filename: req.file.originalname
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Serve frontend static build in production if available
const DIST_DIR = path.resolve(process.cwd(), "dist");
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get("/*splat", (req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`CaseTrack Document Server listening on http://localhost:${PORT}`);
});
