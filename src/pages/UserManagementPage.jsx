/**
 * src/pages/UserManagementPage.jsx
 * Enterprise User Management & Role-Based Access Control Interface.
 * Allows Super Administrators to view, create, edit, deactivate, and delete user accounts,
 * reset passwords, inspect active sessions, and configure role permission matrices.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatTimestamp, todayYYYYMMDD } from "../utils/dateUtils";
import "./UserManagementPage.css";

export function UserManagementPage() {
  const { currentUser, token } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("users"); // "users" | "roles"
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // Form State for Add User
  const [addForm, setAddForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    role: "admin_officer",
    department: "Registrar Desk",
    status: "active"
  });

  // Form State for Edit User
  const [editForm, setEditForm] = useState({
    fullName: "",
    username: "",
    email: "",
    role: "admin_officer",
    department: "",
    status: "active"
  });

  // Form State for Reset Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Fetch users & roles from server
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [usersRes, rolesRes] = await Promise.all([
        fetch("/api/users", { headers }),
        fetch("/api/roles", { headers })
      ]);

      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(uData.users || []);
      }
      if (rolesRes.ok) {
        const rData = await rolesRes.json();
        setRoles(rData.roles || []);
      }
    } catch (err) {
      console.warn("Failed to load user management data:", err);
      addToast("Failed to load users from server.", "danger");
    } finally {
      setIsLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        u.fullName?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.id?.toLowerCase().includes(q);

      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus = statusFilter === "all" || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "active").length;
    const inactive = total - active;
    const totalRoles = roles.length;
    return { total, active, inactive, totalRoles };
  }, [users, roles]);

  // Handler: Add User
  const handleAddUser = async (e) => {
    e.preventDefault();
    setModalError("");
    setActionLoading(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(addForm)
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        addToast(`User account '${data.user.username}' created successfully.`, "success");
        setShowAddModal(false);
        setAddForm({
          fullName: "",
          username: "",
          email: "",
          password: "",
          role: "admin_officer",
          department: "Registrar Desk",
          status: "active"
        });
        loadData();
      } else {
        setModalError(data.error || "Failed to create user account.");
      }
    } catch (err) {
      setModalError("Network error while creating user.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Open Edit Modal
  const openEdit = (u) => {
    setSelectedUser(u);
    setEditForm({
      fullName: u.fullName || "",
      username: u.username || "",
      email: u.email || "",
      role: u.role || "viewer",
      department: u.department || "",
      status: u.status || "active"
    });
    setModalError("");
    setShowEditModal(true);
  };

  // Handler: Save Edit User
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setModalError("");
    setActionLoading(true);

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        addToast(`User '${data.user.username}' updated successfully.`, "success");
        setShowEditModal(false);
        setSelectedUser(null);
        loadData();
      } else {
        setModalError(data.error || "Failed to update user.");
      }
    } catch (err) {
      setModalError("Network error while updating user.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Open Reset Password Modal
  const openPasswordModal = (u) => {
    setSelectedUser(u);
    setNewPassword("");
    setConfirmPassword("");
    setModalError("");
    setShowPasswordModal(true);
  };

  // Handler: Submit Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (newPassword.length < 6) {
      setModalError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setModalError("Passwords do not match.");
      return;
    }

    setModalError("");
    setActionLoading(true);

    try {
      const res = await fetch(`/api/users/${selectedUser.id}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        addToast(`Password for '${selectedUser.username}' reset successfully.`, "success");
        setShowPasswordModal(false);
        setSelectedUser(null);
      } else {
        setModalError(data.error || "Failed to reset password.");
      }
    } catch (err) {
      setModalError("Network error while resetting password.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Open Delete Modal
  const openDeleteModal = (u) => {
    setSelectedUser(u);
    setModalError("");
    setShowDeleteModal(true);
  };

  // Handler: Confirm Delete User
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setModalError("");
    setActionLoading(true);

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        addToast(`User account '${selectedUser.username}' deleted permanently.`, "warning");
        setShowDeleteModal(false);
        setSelectedUser(null);
        loadData();
      } else {
        setModalError(data.error || "Failed to delete user account.");
      }
    } catch (err) {
      setModalError("Network error while deleting user.");
    } finally {
      setActionLoading(false);
    }
  };

  // Helper: Get Role Badge
  const getRoleBadge = (roleId) => {
    switch (roleId) {
      case "super_admin":
        return <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1">Super Admin</span>;
      case "admin_officer":
        return <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">Admin Officer</span>;
      case "registrar_desk":
        return <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">Registrar Desk</span>;
      case "viewer":
        return <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1">Viewer</span>;
      default:
        return <span className="badge bg-info-subtle text-info border border-info-subtle px-2 py-1">{roleId}</span>;
    }
  };

  return (
    <div className="container-fluid px-3 px-md-4 py-3 user-mgmt-page">
      {/* Page Header Card */}
      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body p-3">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2">
                <h4 className="fw-bold mb-0 text-body d-flex align-items-center gap-2">
                  <i className="bi bi-person-gear text-primary"></i>
                  <span>User Management &amp; Access Control</span>
                </h4>
                <span className="badge bg-primary rounded-pill px-3 py-1 fs-7">
                  {users.length} Users
                </span>
              </div>
              <p className="text-secondary small mb-0 mt-1">
                Manage administrative operator accounts, assign role permissions, and audit authentication activity.
              </p>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-primary d-inline-flex align-items-center gap-2 shadow-sm"
                onClick={() => {
                  setModalError("");
                  setShowAddModal(true);
                }}
              >
                <i className="bi bi-person-plus-fill"></i>
                <span>Add User</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top 4 Summary Metrics */}
      <div className="row g-2 mb-3">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm p-3 h-100 bg-body">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="small text-muted fw-semibold text-uppercase">Total Accounts</span>
              <i className="bi bi-people-fill text-primary fs-5"></i>
            </div>
            <div className="fs-4 fw-bold text-body">{stats.total}</div>
            <div className="small text-secondary" style={{ fontSize: "0.74rem" }}>Registered operators</div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm p-3 h-100 bg-body">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="small text-muted fw-semibold text-uppercase">Active Users</span>
              <i className="bi bi-check-circle-fill text-success fs-5"></i>
            </div>
            <div className="fs-4 fw-bold text-success">{stats.active}</div>
            <div className="small text-secondary" style={{ fontSize: "0.74rem" }}>Operational accounts</div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm p-3 h-100 bg-body">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="small text-muted fw-semibold text-uppercase">Inactive</span>
              <i className="bi bi-dash-circle-fill text-warning fs-5"></i>
            </div>
            <div className="fs-4 fw-bold text-warning">{stats.inactive}</div>
            <div className="small text-secondary" style={{ fontSize: "0.74rem" }}>Deactivated / Suspended</div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm p-3 h-100 bg-body">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="small text-muted fw-semibold text-uppercase">Defined Roles</span>
              <i className="bi bi-shield-lock-fill text-info fs-5"></i>
            </div>
            <div className="fs-4 fw-bold text-body">{stats.totalRoles}</div>
            <div className="small text-secondary" style={{ fontSize: "0.74rem" }}>RBAC permission levels</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <ul className="nav nav-pills mb-3 gap-2" role="tablist">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <i className="bi bi-person-lines-fill me-2"></i>User Accounts Directory
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === "roles" ? "active" : ""}`}
            onClick={() => setActiveTab("roles")}
          >
            <i className="bi bi-shield-check me-2"></i>Role Permissions Matrix
          </button>
        </li>
      </ul>

      {/* TAB 1: USERS DIRECTORY */}
      {activeTab === "users" && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-body p-3">
            <div className="row g-2 align-items-center">
              {/* Search Bar */}
              <div className="col-12 col-md-5 col-lg-4">
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-body-tertiary">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search name, username, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => setSearchQuery("")}
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* Role Filter */}
              <div className="col-6 col-md-3 col-lg-3">
                <select
                  className="form-select form-select-sm"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles ({roles.length})</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="col-6 col-md-3 col-lg-2">
                <select
                  className="form-select form-select-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="col-12 col-md-auto ms-auto text-end">
                <span className="text-muted small">
                  Showing <strong>{filteredUsers.length}</strong> of {users.length}
                </span>
              </div>
            </div>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 user-records-table table-fixed-layout">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "120px" }}>User ID</th>
                    <th style={{ width: "18%" }}>Full Name</th>
                    <th style={{ width: "14%" }}>Username</th>
                    <th style={{ width: "20%" }}>Email Address</th>
                    <th style={{ width: "140px" }}>Role</th>
                    <th style={{ width: "14%" }}>Department</th>
                    <th style={{ width: "100px" }}>Status</th>
                    <th style={{ width: "130px" }}>Last Login</th>
                    <th style={{ width: "135px" }} className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-5 text-muted">
                        <i className="bi bi-person-x fs-1 d-block mb-2 text-secondary"></i>
                        No users match the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isCurrent = currentUser?.id === u.id;
                      return (
                        <tr key={u.id} className={!u.status || u.status === "inactive" ? "opacity-75" : ""}>
                          <td>
                            <span className="font-monospace fw-bold text-secondary" style={{ fontSize: "0.78rem" }}>
                              {u.id}
                            </span>
                          </td>
                          <td>
                            <div className="fw-semibold text-body" style={{ overflowWrap: "break-word" }}>
                              {u.fullName}
                              {isCurrent && (
                                <span className="badge bg-primary-subtle text-primary ms-1" style={{ fontSize: "0.65rem" }}>
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="font-monospace text-primary fw-medium" style={{ fontSize: "0.80rem" }}>
                              @{u.username}
                            </span>
                          </td>
                          <td>
                            <div className="text-muted small" style={{ overflowWrap: "break-word" }}>
                              {u.email}
                            </div>
                          </td>
                          <td>{getRoleBadge(u.role)}</td>
                          <td>
                            <span className="text-body small" style={{ overflowWrap: "break-word" }}>
                              {u.department || "--"}
                            </span>
                          </td>
                          <td>
                            {u.status === "active" ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                                <i className="bi bi-check-circle-fill me-1"></i>Active
                              </span>
                            ) : (
                              <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td>
                            <span className="text-muted small" style={{ fontSize: "0.76rem" }}>
                              {u.lastLogin ? formatTimestamp(u.lastLogin) : "Never"}
                            </span>
                          </td>
                          <td className="text-end">
                            <div className="btn-group btn-group-sm">
                              <button
                                type="button"
                                className="btn btn-outline-primary"
                                title="Edit User Details"
                                onClick={() => openEdit(u)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                title="Reset Password"
                                onClick={() => openPasswordModal(u)}
                              >
                                <i className="bi bi-key"></i>
                              </button>
                              <button
                                type="button"
                                className={`btn ${isCurrent ? "btn-outline-secondary disabled" : "btn-outline-danger"}`}
                                title={isCurrent ? "Cannot delete yourself" : "Delete User Account"}
                                disabled={isCurrent}
                                onClick={() => openDeleteModal(u)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROLE PERMISSION MATRIX */}
      {activeTab === "roles" && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-body py-3">
            <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
              <i className="bi bi-shield-lock text-primary"></i>
              <span>Role Permissions Matrix</span>
            </h5>
            <p className="text-secondary small mb-0 mt-1">
              Overview of authorized actions and module visibility across all system roles.
            </p>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-bordered align-middle mb-0 small">
                <thead className="table-light text-center">
                  <tr>
                    <th className="text-start" style={{ width: "25%" }}>Feature / Module</th>
                    <th style={{ width: "18%" }}>Super Admin</th>
                    <th style={{ width: "18%" }}>Admin Officer</th>
                    <th style={{ width: "18%" }}>Registrar Desk</th>
                    <th style={{ width: "18%" }}>Auditor (Viewer)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="fw-semibold">Dashboard &amp; Summary Reports</td>
                    <td className="text-center text-success"><i className="bi bi-check-circle-fill"></i> Full Access</td>
                    <td className="text-center text-success"><i className="bi bi-check-circle-fill"></i> Full Access</td>
                    <td className="text-center text-success"><i className="bi bi-check-circle-fill"></i> Full Access</td>
                    <td className="text-center text-success"><i className="bi bi-check-circle-fill"></i> View Only</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Student Record Management (CRUD)</td>
                    <td className="text-center text-success"><i className="bi bi-check-circle-fill"></i> Full CRUD</td>
                    <td className="text-center text-success"><i className="bi bi-check-circle-fill"></i> Add &amp; Edit</td>
                    <td className="text-center text-info"><i className="bi bi-eye-fill"></i> View Only</td>
                    <td className="text-center text-info"><i className="bi bi-eye-fill"></i> View Only</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Document Upload &amp; PDF Consolidation</td>
                    <td className="text-center text-success"><i className="bi bi-check-circle-fill"></i> Full Upload &amp; Stream</td>
                    <td className="text-center text-success"><i className="bi bi-check-circle-fill"></i> Full Upload &amp; Stream</td>
                    <td className="text-center text-info"><i className="bi bi-eye-fill"></i> View &amp; Print Only</td>
                    <td className="text-center text-muted"><i className="bi bi-dash-circle"></i> Denied</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Workflow Actions (Mark Ready, Dispatch, Return, Receive)</td>
                    <td className="text-center text-success"><i className="bi bi-check-circle-fill"></i> All Stages</td>
                    <td className="text-center text-success"><i className="bi bi-check-circle-fill"></i> All Stages</td>
                    <td className="text-center text-success"><i className="bi bi-check-circle-fill"></i> Authorized Stages</td>
                    <td className="text-center text-muted"><i className="bi bi-dash-circle"></i> Read-Only</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Excel Upload &amp; Data Ingestion</td>
                    <td className="text-center text-success"><i className="bi bi-check-circle-fill"></i> Import &amp; Export</td>
                    <td className="text-center text-success"><i className="bi bi-check-circle-fill"></i> Import &amp; Export</td>
                    <td className="text-center text-info"><i className="bi bi-eye-fill"></i> Export Only</td>
                    <td className="text-center text-muted"><i className="bi bi-dash-circle"></i> Denied</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">JSON Database Backup &amp; Restore</td>
                    <td className="text-center text-success"><i className="bi bi-check-circle-fill"></i> Full Authority</td>
                    <td className="text-center text-muted"><i className="bi bi-dash-circle"></i> Denied</td>
                    <td className="text-center text-muted"><i className="bi bi-dash-circle"></i> Denied</td>
                    <td className="text-center text-muted"><i className="bi bi-dash-circle"></i> Denied</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Clear All Student Data / Factory Reset</td>
                    <td className="text-center text-danger fw-bold"><i className="bi bi-shield-lock-fill"></i> Protected (Super Admin)</td>
                    <td className="text-center text-muted"><i className="bi bi-dash-circle"></i> Denied</td>
                    <td className="text-center text-muted"><i className="bi bi-dash-circle"></i> Denied</td>
                    <td className="text-center text-muted"><i className="bi bi-dash-circle"></i> Denied</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">User Management &amp; Role Assignments</td>
                    <td className="text-center text-danger fw-bold"><i className="bi bi-shield-lock-fill"></i> Full User CRUD</td>
                    <td className="text-center text-muted"><i className="bi bi-dash-circle"></i> Denied</td>
                    <td className="text-center text-muted"><i className="bi bi-dash-circle"></i> Denied</td>
                    <td className="text-center text-muted"><i className="bi bi-dash-circle"></i> Denied</td>
                  </tr>
                  <tr>
                    <td className="fw-semibold">Branding &amp; System Configuration</td>
                    <td className="text-center text-danger fw-bold"><i className="bi bi-shield-lock-fill"></i> Full Authority</td>
                    <td className="text-center text-muted"><i className="bi bi-dash-circle"></i> Denied</td>
                    <td className="text-center text-muted"><i className="bi bi-dash-circle"></i> Denied</td>
                    <td className="text-center text-muted"><i className="bi bi-dash-circle"></i> Denied</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS
          ========================================================================= */}

      {/* 1. ADD USER MODAL */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-person-plus-fill text-primary"></i>
                  <span>Create User Account</span>
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>

              <form onSubmit={handleAddUser}>
                <div className="modal-body p-4">
                  {modalError && (
                    <div className="alert alert-danger py-2 small mb-3 border-0">
                      <i className="bi bi-exclamation-circle me-1"></i>{modalError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Sarah Khan"
                      value={addForm.fullName}
                      onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Username *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. skhan"
                        value={addForm.username}
                        onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Role *</label>
                      <select
                        className="form-select"
                        value={addForm.role}
                        onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                        required
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email Address *</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="e.g. skhan@casetrack.iqra.edu.pk"
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Initial Password * (min 6 characters)</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Enter secure initial password"
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="row g-2">
                    <div className="col-8">
                      <label className="form-label small fw-semibold">Department</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Registrar Desk / Examinations"
                        value={addForm.department}
                        onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label small fw-semibold">Account Status</label>
                      <select
                        className="form-select"
                        value={addForm.status}
                        onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top bg-body-tertiary">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    {actionLoading ? "Creating..." : "Create Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 2. EDIT USER MODAL */}
      {showEditModal && selectedUser && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-pencil-square text-primary"></i>
                  <span>Edit User – {selectedUser.fullName}</span>
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>

              <form onSubmit={handleUpdateUser}>
                <div className="modal-body p-4">
                  {modalError && (
                    <div className="alert alert-danger py-2 small mb-3 border-0">
                      <i className="bi bi-exclamation-circle me-1"></i>{modalError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Username *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.username}
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Assigned Role *</label>
                      <select
                        className="form-select"
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        required
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email Address *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-2">
                    <div className="col-8">
                      <label className="form-label small fw-semibold">Department</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.department}
                        onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label small fw-semibold">Status</label>
                      <select
                        className="form-select"
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top bg-body-tertiary">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    {actionLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 3. RESET PASSWORD MODAL */}
      {showPasswordModal && selectedUser && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-key-fill text-warning"></i>
                  <span>Reset Password – @{selectedUser.username}</span>
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowPasswordModal(false)}></button>
              </div>

              <form onSubmit={handleResetPassword}>
                <div className="modal-body p-4">
                  {modalError && (
                    <div className="alert alert-danger py-2 small mb-3 border-0">
                      <i className="bi bi-exclamation-circle me-1"></i>{modalError}
                    </div>
                  )}

                  <p className="text-secondary small mb-3">
                    Assign a new secure password for <strong>{selectedUser.fullName}</strong>. The user will be required to authenticate with this new password on next login.
                  </p>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">New Password (min 6 characters)</label>
                    <div className="input-group">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        className="form-control"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        <i className={`bi ${showNewPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Confirm New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="modal-footer border-top bg-body-tertiary">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning" disabled={actionLoading}>
                    {actionLoading ? "Updating..." : "Reset Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 4. DELETE USER CONFIRMATION MODAL */}
      {showDeleteModal && selectedUser && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 border-top border-4 border-danger">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-danger d-flex align-items-center gap-2">
                  <i className="bi bi-trash-fill"></i>
                  <span>Delete User Account</span>
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
              </div>

              <div className="modal-body p-4">
                {modalError && (
                  <div className="alert alert-danger py-2 small mb-3 border-0">
                    <i className="bi bi-exclamation-circle me-1"></i>{modalError}
                  </div>
                )}

                <p className="mb-2 text-body">
                  Are you sure you want to permanently delete user account{" "}
                  <strong>{selectedUser.fullName}</strong> (<code>@{selectedUser.username}</code>)?
                </p>
                <div className="p-2 border rounded bg-body-tertiary small text-muted">
                  Role: <strong>{selectedUser.role}</strong> &bull; Department: <strong>{selectedUser.department}</strong>
                </div>
                <div className="text-danger small mt-2">
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  This action cannot be undone. Active sessions for this user will be terminated immediately.
                </div>
              </div>

              <div className="modal-footer border-top bg-body-tertiary">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={actionLoading}
                  onClick={handleDeleteUser}
                >
                  {actionLoading ? "Deleting..." : "Permanently Delete User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
