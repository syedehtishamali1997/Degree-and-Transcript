/**
 * server/documentService.js
 * Domain logic for student folder management, file validation, and PDF consolidation using pdf-lib.
 */

import fs from "node:fs";
import path from "node:path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export const DOCUMENTS_DIR = path.resolve(process.cwd(), "documents");

// Ensure base documents directory exists
if (!fs.existsSync(DOCUMENTS_DIR)) {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

/**
 * Sanitizes student names and IDs to create safe directory names.
 * Prevents directory traversal attacks (no .. or /).
 */
export function sanitizeFolderName(studentId, studentName) {
  const cleanId = String(studentId || "unknown")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  const cleanName = String(studentName || "student")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");
  return `${cleanId}_${cleanName}`;
}

/**
 * Validates file magic bytes to verify actual content type.
 */
export function validateFileMagicBytes(buffer, mimeType) {
  if (!buffer || buffer.length < 4) return false;

  // PDF: %PDF (25 50 44 46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return true;
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return true;
  }

  // JPEG / JPG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }

  return false;
}

/**
 * Ensures student folder structure is initialized.
 * Reuses existing folder if already created.
 */
export function ensureStudentFolder(studentId, studentName, studentData = {}) {
  // Check if a folder starting with cleanId exists already
  const cleanId = String(studentId).trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  let targetFolderName = null;

  if (fs.existsSync(DOCUMENTS_DIR)) {
    const existingFolders = fs.readdirSync(DOCUMENTS_DIR);
    for (const folder of existingFolders) {
      if (folder.toLowerCase().startsWith(cleanId.toLowerCase() + "_")) {
        targetFolderName = folder;
        break;
      }
    }
  }

  if (!targetFolderName) {
    targetFolderName = sanitizeFolderName(studentId, studentName);
  }

  const studentFolderPath = path.join(DOCUMENTS_DIR, targetFolderName);
  const transcriptsPath = path.join(studentFolderPath, "transcripts");
  const academicPath = path.join(studentFolderPath, "academic_documents");
  const additionalDegreesPath = path.join(academicPath, "Additional_Degrees");

  fs.mkdirSync(transcriptsPath, { recursive: true });
  fs.mkdirSync(additionalDegreesPath, { recursive: true });

  const infoFilePath = path.join(studentFolderPath, "student_information.json");
  let existingInfo = {};
  if (fs.existsSync(infoFilePath)) {
    try {
      existingInfo = JSON.parse(fs.readFileSync(infoFilePath, "utf8"));
    } catch {
      existingInfo = {};
    }
  }

  const updatedInfo = {
    ...existingInfo,
    ...studentData,
    studentId: studentId,
    name: studentName,
    folderName: targetFolderName,
    lastAccessed: new Date().toISOString()
  };

  fs.writeFileSync(infoFilePath, JSON.stringify(updatedInfo, null, 2), "utf8");

  return {
    folderName: targetFolderName,
    folderPath: studentFolderPath,
    transcriptsPath,
    academicPath,
    additionalDegreesPath,
    info: updatedInfo
  };
}

/**
 * Scans a student folder to collect all uploaded documents.
 */
export function getStudentDocumentsMetadata(folderName) {
  const studentFolderPath = path.join(DOCUMENTS_DIR, folderName);
  if (!fs.existsSync(studentFolderPath)) {
    return null;
  }

  const infoFilePath = path.join(studentFolderPath, "student_information.json");
  let info = {};
  if (fs.existsSync(infoFilePath)) {
    try {
      info = JSON.parse(fs.readFileSync(infoFilePath, "utf8"));
    } catch {
      info = {};
    }
  }

  const documents = [];

  // 1. Transcripts
  const transcriptsPath = path.join(studentFolderPath, "transcripts");
  if (fs.existsSync(transcriptsPath)) {
    const files = fs.readdirSync(transcriptsPath);
    for (const file of files) {
      const fullPath = path.join(transcriptsPath, file);
      const stat = fs.statSync(fullPath);
      documents.push({
        category: "transcripts",
        fieldKey: file.toLowerCase().includes("edp") ? "edpTranscript" : "examTranscript",
        fileName: file,
        sizeBytes: stat.size,
        updatedAt: stat.mtime.toISOString(),
        url: `/api/documents/${folderName}/file/transcripts/${encodeURIComponent(file)}`
      });
    }
  }

  // 2. Academic Documents
  const academicPath = path.join(studentFolderPath, "academic_documents");
  if (fs.existsSync(academicPath)) {
    const files = fs.readdirSync(academicPath);
    for (const file of files) {
      if (file === "Additional_Degrees") continue;
      const fullPath = path.join(academicPath, file);
      if (fs.statSync(fullPath).isFile()) {
        const stat = fs.statSync(fullPath);
        documents.push({
          category: "academic_documents",
          fieldKey: file.replace(/\.[^/.]+$/, ""),
          fileName: file,
          sizeBytes: stat.size,
          updatedAt: stat.mtime.toISOString(),
          url: `/api/documents/${folderName}/file/academic_documents/${encodeURIComponent(file)}`
        });
      }
    }
  }

  // 3. Additional Degrees
  const additionalDegreesPath = path.join(academicPath, "Additional_Degrees");
  if (fs.existsSync(additionalDegreesPath)) {
    const files = fs.readdirSync(additionalDegreesPath);
    for (const file of files) {
      const fullPath = path.join(additionalDegreesPath, file);
      if (fs.statSync(fullPath).isFile()) {
        const stat = fs.statSync(fullPath);
        documents.push({
          category: "additional_degrees",
          fieldKey: "additional_degree",
          fileName: file,
          sizeBytes: stat.size,
          updatedAt: stat.mtime.toISOString(),
          url: `/api/documents/${folderName}/file/academic_documents/Additional_Degrees/${encodeURIComponent(file)}`
        });
      }
    }
  }

  const finalPdfPath = path.join(studentFolderPath, "Final_Student_Document.pdf");
  const hasFinalPdf = fs.existsSync(finalPdfPath);

  return {
    folderName,
    info,
    documents,
    hasFinalPdf,
    finalPdfUrl: hasFinalPdf ? `/api/documents/${folderName}/final-pdf` : null
  };
}

/**
 * Builds a single consolidated PDF merging all submitted documents in order.
 */
export async function generateConsolidatedPdf(folderName, orderedDocList) {
  const studentFolderPath = path.join(DOCUMENTS_DIR, folderName);
  const mergedPdf = await PDFDocument.create();
  const boldFont = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await mergedPdf.embedFont(StandardFonts.Helvetica);

  const a4W = 595.28;
  const a4H = 841.89;

  for (const doc of orderedDocList) {
    if (!doc.filePath || !fs.existsSync(doc.filePath)) continue;

    const fileBuffer = fs.readFileSync(doc.filePath);
    const ext = path.extname(doc.filePath).toLowerCase();

    // If item is an additional degree, insert a clean separator / title page first
    if (doc.isAdditionalDegree && doc.degreeName) {
      const titlePage = mergedPdf.addPage([a4W, a4H]);

      // Header Banner
      titlePage.drawRectangle({
        x: 40,
        y: a4H - 120,
        width: a4W - 80,
        height: 60,
        color: rgb(0.435, 0.258, 0.757) // Purple #6f42c1
      });

      titlePage.drawText("ADDITIONAL DEGREE DOCUMENT", {
        x: 60,
        y: a4H - 85,
        size: 16,
        font: boldFont,
        color: rgb(1, 1, 1)
      });

      titlePage.drawText(`Degree Program / Title: ${doc.degreeName}`, {
        x: 60,
        y: a4H - 170,
        size: 14,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1)
      });

      titlePage.drawText(`Attached File: ${path.basename(doc.filePath)}`, {
        x: 60,
        y: a4H - 200,
        size: 11,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3)
      });

      titlePage.drawText("The attached certified degree document follows on the subsequent page.", {
        x: 60,
        y: a4H - 230,
        size: 10,
        font: regularFont,
        color: rgb(0.4, 0.4, 0.4)
      });
    }

    if (ext === ".pdf") {
      try {
        const srcPdf = await PDFDocument.load(fileBuffer);
        const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      } catch (pdfErr) {
        console.warn(`Could not copy PDF ${doc.filePath}:`, pdfErr);
      }
    } else if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
      try {
        let image;
        if (ext === ".png") {
          image = await mergedPdf.embedPng(fileBuffer);
        } else {
          image = await mergedPdf.embedJpg(fileBuffer);
        }

        const imgScale = image.scale(1);
        const margin = 40;
        const maxW = a4W - margin * 2;
        const maxH = a4H - margin * 2;

        const scale = Math.min(maxW / imgScale.width, maxH / imgScale.height, 1);
        const drawW = imgScale.width * scale;
        const drawH = imgScale.height * scale;
        const posX = (a4W - drawW) / 2;
        const posY = (a4H - drawH) / 2;

        const imgPage = mergedPdf.addPage([a4W, a4H]);
        imgPage.drawImage(image, {
          x: posX,
          y: posY,
          width: drawW,
          height: drawH
        });
      } catch (imgErr) {
        console.warn(`Could not embed image ${doc.filePath}:`, imgErr);
      }
    }
  }

  // Ensure there is at least one page
  if (mergedPdf.getPageCount() === 0) {
    const blank = mergedPdf.addPage([a4W, a4H]);
    blank.drawText("No valid document pages were provided.", { x: 50, y: 750, size: 14, font: regularFont });
  }

  const finalBytes = await mergedPdf.save();
  const finalPdfPath = path.join(studentFolderPath, "Final_Student_Document.pdf");
  fs.writeFileSync(finalPdfPath, finalBytes);

  return {
    finalPdfPath,
    pageCount: mergedPdf.getPageCount(),
    fileSizeBytes: finalBytes.length
  };
}

/**
 * Safely deletes a specific student's document folder from documents/.
 * Prevents directory traversal attacks.
 */
export function deleteStudentFolder(studentId) {
  const cleanId = String(studentId || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  if (!cleanId || cleanId === "." || cleanId === "..") {
    return { ok: false, error: "Invalid student ID." };
  }

  if (!fs.existsSync(DOCUMENTS_DIR)) {
    return { ok: true, deleted: false, count: 0 };
  }

  const entries = fs.readdirSync(DOCUMENTS_DIR);
  let deletedCount = 0;
  for (const entry of entries) {
    if (entry.toLowerCase().startsWith(cleanId.toLowerCase() + "_")) {
      const targetPath = path.join(DOCUMENTS_DIR, entry);
      if (targetPath.startsWith(DOCUMENTS_DIR) && targetPath !== DOCUMENTS_DIR) {
        fs.rmSync(targetPath, { recursive: true, force: true });
        deletedCount++;
      }
    }
  }
  return { ok: true, deleted: deletedCount > 0, count: deletedCount };
}

/**
 * Safely cleans all student folders within documents/.
 * Preserves the base documents/ directory.
 */
export function clearAllStudentFolders() {
  if (!fs.existsSync(DOCUMENTS_DIR)) {
    return { ok: true, count: 0 };
  }

  const entries = fs.readdirSync(DOCUMENTS_DIR);
  let deletedCount = 0;
  for (const entry of entries) {
    const targetPath = path.join(DOCUMENTS_DIR, entry);
    if (targetPath.startsWith(DOCUMENTS_DIR) && targetPath !== DOCUMENTS_DIR) {
      fs.rmSync(targetPath, { recursive: true, force: true });
      deletedCount++;
    }
  }
  return { ok: true, count: deletedCount };
}
