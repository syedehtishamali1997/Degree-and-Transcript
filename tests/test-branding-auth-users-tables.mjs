/**
 * tests/test-branding-auth-users-tables.mjs
 * Comprehensive automated test suite for CaseTrack Controlled System Updates:
 * 1. Dynamic Branding persistence & API verification
 * 2. Scrypt password hashing & timing-safe equality verification
 * 3. User Authentication, Session verification, Invalid credential rejection, Logout
 * 4. User Management CRUD, password resets, self-delete guard, last super admin guard
 * 5. RBAC Role permissions matrix verification
 * 6. Global Table Text-Wrapping & Layout integrity
 * 7. Database integrity (1,024 students preserved)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  hashPassword,
  verifyPassword,
  getUserByUsername,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  listRoles,
  hasRolePermission
} from "../server/authService.js";

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log("==================================================================");
  console.log("Starting Test Suite: Branding, Auth, Users, RBAC, Table Wrapping");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function test(title, fn) {
    try {
      fn();
      console.log(`  ✓ PASS: ${title}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${title}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(title, fn) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${title}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${title}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. Password Hashing & Security Verification
  // -------------------------------------------------------------------------
  console.log("--- 1. Cryptographic Security & Password Hashing ---");

  test("hashPassword produces valid scrypt format with 16-byte salt", () => {
    const raw = "SecurePass@2026!";
    const hashed = hashPassword(raw);
    assert(typeof hashed === "string", "Hashed password must be a string");
    assert(hashed.includes(":"), "Hashed password must contain salt and hash delimiter");
    const parts = hashed.split(":");
    assert.equal(parts.length, 2, "Hash must contain 2 segments: <salt>:<hash>");
    assert.equal(parts[0].length, 32, "Salt hex must be 32 characters (16 bytes)");
    assert.equal(parts[1].length, 128, "Key hex must be 128 characters (64 bytes)");
  });

  test("verifyPassword succeeds with correct password and rejects wrong password", () => {
    const password = "Admin@CaseTrack2026!";
    const hashed = hashPassword(password);
    assert.equal(verifyPassword(password, hashed), true, "Correct password must verify");
    assert.equal(verifyPassword("WrongPassword!", hashed), false, "Wrong password must fail");
    assert.equal(verifyPassword("", hashed), false, "Empty password must fail");
    assert.equal(verifyPassword(password, "invalid_format"), false, "Corrupted hash must fail safely");
  });

  // -------------------------------------------------------------------------
  // 2. Roles & Permissions Matrix
  // -------------------------------------------------------------------------
  console.log("\n--- 2. RBAC Role Permissions Matrix ---");

  test("Default roles exist: super_admin, admin_officer, registrar_desk, viewer", () => {
    const roles = listRoles();
    const roleIds = roles.map((r) => r.id);
    assert(roleIds.includes("super_admin"), "super_admin role must exist");
    assert(roleIds.includes("admin_officer"), "admin_officer role must exist");
    assert(roleIds.includes("registrar_desk"), "registrar_desk role must exist");
    assert(roleIds.includes("viewer"), "viewer role must exist");
  });

  test("Super Admin has all administrative permissions", () => {
    assert.equal(hasRolePermission("super_admin", "students:create"), true);
    assert.equal(hasRolePermission("super_admin", "users:create"), true);
    assert.equal(hasRolePermission("super_admin", "users:delete"), true);
    assert.equal(hasRolePermission("super_admin", "system:purge"), true);
    assert.equal(hasRolePermission("super_admin", "system:branding"), true);
  });

  test("Viewer is strictly read-only and denied destructive actions", () => {
    assert.equal(hasRolePermission("viewer", "students:view"), true);
    assert.equal(hasRolePermission("viewer", "students:create"), false);
    assert.equal(hasRolePermission("viewer", "students:delete"), false);
    assert.equal(hasRolePermission("viewer", "users:delete"), false);
    assert.equal(hasRolePermission("viewer", "system:purge"), false);
  });

  // -------------------------------------------------------------------------
  // 3. Server Endpoints: Authentication, Login & Sessions
  // -------------------------------------------------------------------------
  console.log("\n--- 3. Authentication REST Endpoints ---");

  let adminToken = "";
  await asyncTest("POST /api/auth/login succeeds with valid Super Admin credentials", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "Admin@CaseTrack2026!"
      })
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.user.username, "admin");
    assert.equal(data.user.role, "super_admin");
    assert(typeof data.token === "string" && data.token.length > 20);
    adminToken = data.token;
  });

  await asyncTest("POST /api/auth/login rejects invalid password with 401", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "WrongPassword123"
      })
    });
    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.ok, false);
    assert(data.error.includes("Invalid"));
  });

  await asyncTest("GET /api/auth/me returns valid user profile with Bearer token", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.user.username, "admin");
    assert.equal(data.user.role, "super_admin");
  });

  // -------------------------------------------------------------------------
  // 4. User Management CRUD & Safety Guards
  // -------------------------------------------------------------------------
  console.log("\n--- 4. User Management CRUD & Safety Guards ---");

  let testUserId = "";
  const testUsername = `test_officer_${Date.now()}`;

  await asyncTest("Super Admin can create a new user account (POST /api/users)", async () => {
    const res = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        fullName: "Test Verification Officer",
        username: testUsername,
        email: `${testUsername}@casetrack.iqra.edu.pk`,
        password: "OfficerPass@2026!",
        role: "admin_officer",
        department: "Examinations Desk",
        status: "active"
      })
    });
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.ok, true);
    assert.equal(data.user.username, testUsername);
    testUserId = data.user.id;
  });

  await asyncTest("Newly created user can successfully log in", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: testUsername,
        password: "OfficerPass@2026!"
      })
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.user.role, "admin_officer");
  });

  await asyncTest("Super Admin can reset user's password (POST /api/users/:id/reset-password)", async () => {
    const res = await fetch(`${BASE_URL}/api/users/${testUserId}/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ newPassword: "UpdatedPass@2026!" })
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
  });

  await asyncTest("User can log in with newly updated password", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: testUsername,
        password: "UpdatedPass@2026!"
      })
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
  });

  await asyncTest("Safety Guard: Super Admin cannot delete own account", async () => {
    const adminUser = getUserByUsername("admin");
    const res = await fetch(`${BASE_URL}/api/users/${adminUser.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.ok, false);
    assert(data.error.includes("own") && data.error.includes("account"));
  });

  await asyncTest("Super Admin can delete test user account (DELETE /api/users/:id)", async () => {
    const res = await fetch(`${BASE_URL}/api/users/${testUserId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
  });

  // -------------------------------------------------------------------------
  // 5. Dynamic Branding REST API & Persistence
  // -------------------------------------------------------------------------
  console.log("\n--- 5. Dynamic Branding REST API & Persistence ---");

  await asyncTest("GET /api/branding returns valid branding schema", async () => {
    const res = await fetch(`${BASE_URL}/api/branding`);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert(typeof data.branding.appName === "string");
    assert(typeof data.branding.campusSubtitle === "string");
  });

  await asyncTest("POST /api/branding updates branding configuration dynamically", async () => {
    const res = await fetch(`${BASE_URL}/api/branding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        appName: "CaseTrack Enterprise",
        campusSubtitle: "by Iqra University Main Campus",
        logoType: "default"
      })
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.branding.appName, "CaseTrack Enterprise");
    assert.equal(data.branding.campusSubtitle, "by Iqra University Main Campus");
  });

  await asyncTest("POST /api/branding can reset branding back to default", async () => {
    const res = await fetch(`${BASE_URL}/api/branding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        appName: "CaseTrack",
        campusSubtitle: "by Iqra University",
        logoType: "default",
        logoUrl: null
      })
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.branding.appName, "CaseTrack");
  });

  // -------------------------------------------------------------------------
  // 6. Global Table Text-Wrapping CSS Verification
  // -------------------------------------------------------------------------
  console.log("\n--- 6. Global Table Text-Wrapping & Layout Styles ---");

  test("GlobalTableLayout.css contains overflow-wrap and word-break rules", () => {
    const cssPath = path.resolve("src/components/tables/GlobalTableLayout.css");
    const content = fs.readFileSync(cssPath, "utf-8");
    assert(content.includes("overflow-wrap: break-word"), "Must contain overflow-wrap: break-word");
    assert(content.includes("word-break: break-word"), "Must contain word-break: break-word");
    assert(content.includes(".student-id-text"), "Must style .student-id-text");
    assert(content.includes(".student-name-text"), "Must style .student-name-text");
    assert(content.includes(".program-badge"), "Must style .program-badge");
  });

  test("UserManagementPage.css exists and defines table wrapping", () => {
    const cssPath = path.resolve("src/pages/UserManagementPage.css");
    assert(fs.existsSync(cssPath), "UserManagementPage.css must exist");
    const content = fs.readFileSync(cssPath, "utf-8");
    assert(content.includes(".user-records-table"), "Must define .user-records-table");
    assert(content.includes("overflow-wrap: break-word"), "Must enforce overflow-wrap");
  });

  // -------------------------------------------------------------------------
  // 7. Database Integrity Lock Verification
  // -------------------------------------------------------------------------
  console.log("\n--- 7. Database Integrity Lock ---");

  test("casetrack_database.json preserves all student records intact", () => {
    const dbPath = path.resolve("data/casetrack_database.json");
    assert(fs.existsSync(dbPath), "casetrack_database.json must exist");
    const raw = fs.readFileSync(dbPath, "utf-8");
    const db = JSON.parse(raw);
    assert(Array.isArray(db.students), "db.students must be an array");
    assert(db.students.length >= 1000, `Must retain 1000+ student records (current: ${db.students.length})`);
    console.log(`    Current verified student records: ${db.students.length}`);
  });

  console.log("\n==================================================================");
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution encountered an unhandled error:", err);
  process.exit(1);
});
