import React, { useState, useEffect, useRef } from "react";
import { useCaseTrack } from "../context/CaseTrackContext";
import { useToast } from "../context/ToastContext";
import { StorageService } from "../services/StorageService";
import { BrandingService, ALLOWED_LOGO_EXTENSIONS } from "../services/BrandingService";
import { nowLocalISO, todayYYYYMMDD } from "../utils/dateUtils";

export function SettingsPage() {
  const {
    database,
    settings,
    updateSettings,
    clearNotifications,
    notifications,
    replaceDatabase,
    storageMetrics,
    refreshStorageMetrics,
    branding,
    updateBranding,
    resetBrandingToDefault
  } = useCaseTrack();

  const { addToast } = useToast();
  const fileInputRef = useRef(null);

  // General Settings Form
  const [formState, setFormState] = useState({
    campusName: settings.campusName || "by Iqra University",
    operatorName: settings.operatorName || "Admin Officer",
    pageSize: settings.pageSize || 25,
    theme: settings.theme || "light"
  });

  // Dynamic Branding Form
  const [brandingForm, setBrandingForm] = useState({
    appName: branding?.appName || "CaseTrack",
    campusSubtitle: branding?.campusSubtitle || settings.campusName || "by Iqra University",
    logoType: branding?.logoType || "default",
    logoUrl: branding?.logoUrl || null,
    logoFileName: ""
  });
  const [brandingChanged, setBrandingChanged] = useState(false);
  const [brandingError, setBrandingError] = useState("");
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  const [storageBytes, setStorageBytes] = useState(0);

  useEffect(() => {
    setFormState({
      campusName: settings.campusName || "by Iqra University",
      operatorName: settings.operatorName || "Admin Officer",
      pageSize: settings.pageSize || 25,
      theme: settings.theme || "light"
    });
    setStorageBytes(StorageService.getStorageUsageBytes());
  }, [settings]);

  useEffect(() => {
    setBrandingForm({
      appName: branding?.appName || "CaseTrack",
      campusSubtitle: branding?.campusSubtitle || settings.campusName || "by Iqra University",
      logoType: branding?.logoType || "default",
      logoUrl: branding?.logoUrl || null,
      logoFileName: ""
    });
    setBrandingChanged(false);
  }, [branding, settings.campusName]);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    updateSettings(formState);
    addToast("System settings updated successfully.", "success");
  };

  // Branding Handlers
  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBrandingError("");

    const validation = BrandingService.validateLogoFile(file);
    if (!validation.valid) {
      setBrandingError(validation.error);
      return;
    }

    try {
      const dataUrl = await BrandingService.readLogoAsDataUrl(file);
      setBrandingForm((prev) => ({
        ...prev,
        logoType: "custom",
        logoUrl: dataUrl,
        logoFileName: file.name
      }));
      setBrandingChanged(true);
    } catch (err) {
      setBrandingError("Failed to load logo image: " + err.message);
    }
  };

  const handleRemoveCustomLogo = () => {
    setBrandingForm((prev) => ({
      ...prev,
      logoType: "default",
      logoUrl: null,
      logoFileName: ""
    }));
    setBrandingChanged(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setIsSavingBranding(true);
    setBrandingError("");

    try {
      const res = await updateBranding({
        appName: brandingForm.appName.trim() || "CaseTrack",
        campusSubtitle: brandingForm.campusSubtitle.trim(),
        logoType: brandingForm.logoType,
        logoUrl: brandingForm.logoUrl
      });

      if (res && res.ok === false) {
        setBrandingError(res.error || "Failed to persist branding.");
      } else {
        setBrandingChanged(false);
        addToast("System branding updated and published across all views.", "success");
      }
    } catch (err) {
      setBrandingError("Failed to update branding: " + err.message);
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleCancelBranding = () => {
    setBrandingForm({
      appName: branding?.appName || "CaseTrack",
      campusSubtitle: branding?.campusSubtitle || settings.campusName || "by Iqra University",
      logoType: branding?.logoType || "default",
      logoUrl: branding?.logoUrl || null,
      logoFileName: ""
    });
    setBrandingChanged(false);
    setBrandingError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRestoreDefaultBranding = () => {
    if (!window.confirm("Restore branding to factory default ('CaseTrack by Iqra University')?")) {
      return;
    }
    resetBrandingToDefault();
    setBrandingForm({
      appName: "CaseTrack",
      campusSubtitle: "by Iqra University",
      logoType: "default",
      logoUrl: null,
      logoFileName: ""
    });
    setBrandingChanged(false);
    setBrandingError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    addToast("Default system branding restored.", "info");
  };

  const handleClearNotifications = () => {
    clearNotifications();
    addToast("All notification logs cleared.", "info");
  };

  // Export diagnostic bundle
  const handleExportDiagnostics = () => {
    const diagnostic = {
      exportedAt: nowLocalISO(),
      appVersion: database.version,
      databaseStats: {
        studentCount: database.students?.length || 0,
        historyEventCount: database.history?.length || 0,
        notificationCount: database.notifications?.length || 0,
        storageUsageBytes: storageBytes,
        storageUsageKB: (storageBytes / 1024).toFixed(2)
      },
      branding: database.settings?.branding || branding,
      settings: database.settings,
      browserEnvironment: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform
      }
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(diagnostic, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `CaseTrack_Diagnostics_${todayYYYYMMDD()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();

    addToast("Diagnostic support bundle exported successfully.", "success");
  };

  // Seed sample demo data
  const handleSeedDemoData = () => {
    if (database.students?.length > 0) {
      if (!window.confirm("Seeding demo data will append/replace existing records. Do you want to proceed?")) {
        return;
      }
    }

    const demoStudents = [
      {
        studentId: "IU04-0122-0001",
        name: "Muhammad Ahmed",
        program: "BSCS",
        applyOn: "2026-10-15",
        status: "Pending",
        serialNumber: 1
      },
      {
        studentId: "IU04-0122-0002",
        name: "Ayesha Khan",
        program: "BBA",
        applyOn: "2026-10-18",
        status: "Pending",
        serialNumber: 2
      },
      {
        studentId: "IU04-0122-0003",
        name: "Hamza Tariq",
        program: "BSSE",
        applyOn: "2026-10-20",
        caseReady: "2026-10-25T10:00:00",
        status: "Case Ready",
        serialNumber: 3
      },
      {
        studentId: "IU04-0122-0004",
        name: "Zainab Fatima",
        program: "MBA",
        applyOn: "2026-10-22",
        caseReady: "2026-10-26T11:30:00",
        sendHistory: [
          {
            sentAt: "2026-10-28T09:15:00",
            operator: "Admin Officer",
            notes: "Batch #1 dispatch"
          }
        ],
        status: "Sent to Main Campus",
        serialNumber: 4
      },
      {
        studentId: "IU04-0122-0005",
        name: "Bilal Hassan",
        program: "BEMS",
        applyOn: "2026-10-25",
        caseReady: "2026-10-29T14:00:00",
        sendHistory: [
          {
            sentAt: "2026-11-01T10:00:00",
            operator: "Admin Officer",
            notes: "Dispatch attempt 1",
            returnedAt: "2026-11-04T16:20:00",
            returnReason: "Library fine pending clearance from Main Campus library."
          }
        ],
        status: "Returned from Main Campus",
        serialNumber: 5
      },
      {
        studentId: "IU04-0122-0006",
        name: "Sara Siddiqui",
        program: "Pharm-D",
        applyOn: "2026-10-10",
        caseReady: "2026-10-14T09:00:00",
        sendHistory: [
          {
            sentAt: "2026-10-16T11:00:00",
            operator: "Admin Officer"
          }
        ],
        received: "2026-10-24T15:30:00",
        status: "Received from Main Campus",
        serialNumber: 6
      }
    ];

    replaceDatabase({
      ...database,
      students: demoStudents
    });

    addToast("Sample demo student database loaded successfully.", "success");
  };

  const storageKB = (storageBytes / 1024).toFixed(1);

  return (
    <div className="container-fluid px-3 px-md-4 py-3">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="fw-bold mb-1 text-body">System Settings</h3>
          <p className="text-secondary small mb-0">
            Configure dynamic application branding, administrative preferences, themes, and storage diagnostics.
          </p>
        </div>
      </div>

      <div className="row g-3">
        {/* =========================================================================
            CARD 1: DYNAMIC APPLICATION BRANDING & IDENTITY
            ========================================================================= */}
        <div className="col-12">
          <div className="card shadow-sm border-0 border-top border-4 border-primary">
            <div className="card-header bg-body py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-palette text-primary"></i>
                  <span>Dynamic Application Branding &amp; Identity</span>
                </h5>
                <div className="text-muted small mt-1">
                  Customize the system name, subtitle, and institutional logo. Changes reflect instantly across the Sidebar, Header, Login Screen, Document Title, and Browser Favicon.
                </div>
              </div>

              <button
                type="button"
                className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1"
                onClick={handleRestoreDefaultBranding}
                title="Reset to Iqra University CaseTrack defaults"
              >
                <i className="bi bi-arrow-counterclockwise"></i>
                <span>Restore Default Branding</span>
              </button>
            </div>

            <div className="card-body p-4">
              <form onSubmit={handleSaveBranding}>
                {brandingError && (
                  <div className="alert alert-danger py-2 px-3 small border-0 mb-3 d-flex align-items-center gap-2">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    <div>{brandingError}</div>
                  </div>
                )}

                <div className="row g-4">
                  {/* Left Column: Form Inputs */}
                  <div className="col-12 col-lg-7">
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-body">
                        Application Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={brandingForm.appName}
                        onChange={(e) => {
                          setBrandingForm({ ...brandingForm, appName: e.target.value });
                          setBrandingChanged(true);
                        }}
                        placeholder="e.g., CaseTrack"
                        required
                      />
                      <div className="form-text small">
                        Primary system identifier displayed in navigation brand, document title, and login page.
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-body">
                        Campus Name / Subtitle
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={brandingForm.campusSubtitle}
                        onChange={(e) => {
                          setBrandingForm({ ...brandingForm, campusSubtitle: e.target.value });
                          setBrandingChanged(true);
                        }}
                        placeholder="e.g., by Iqra University / Main Campus"
                      />
                      <div className="form-text small">
                        Secondary institution label displayed beneath the title in the sidebar and login screen.
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-body">
                        Institutional Logo / Icon File
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="form-control"
                        accept=".png,.jpg,.jpeg,.svg,.ico"
                        onChange={handleLogoFileChange}
                      />
                      <div className="form-text small">
                        Supported formats: <strong>PNG, JPG, JPEG, SVG, ICO</strong> (Max size: 5 MB).
                      </div>
                    </div>

                    {brandingForm.logoType === "custom" && brandingForm.logoUrl && (
                      <div className="mb-3 d-flex align-items-center gap-2">
                        <span className="badge bg-success-subtle text-success border border-success-subtle py-1 px-2">
                          <i className="bi bi-check2-circle me-1"></i>Custom Logo Selected
                        </span>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm py-0 px-2"
                          onClick={handleRemoveCustomLogo}
                          style={{ fontSize: "0.75rem" }}
                        >
                          <i className="bi bi-x-circle me-1"></i>Revert to Default Icon
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Live Branding Previews */}
                  <div className="col-12 col-lg-5">
                    <label className="form-label small fw-semibold text-body mb-2 d-block">
                      <i className="bi bi-eye me-1"></i>Live Branding Preview
                    </label>

                    {/* Preview 1: Sidebar Dark Brand Header */}
                    <div className="p-3 rounded mb-3" style={{ backgroundColor: "#1e1e2d", color: "#ffffff" }}>
                      <div className="small text-muted mb-2 text-uppercase" style={{ fontSize: "0.68rem", letterSpacing: "1px" }}>
                        Sidebar Header Appearance
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        <div
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "8px",
                            backgroundColor: "rgba(255,255,255,0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden"
                          }}
                        >
                          {brandingForm.logoType === "custom" && brandingForm.logoUrl ? (
                            <img
                              src={brandingForm.logoUrl}
                              alt="Logo Preview"
                              style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            />
                          ) : (
                            <i className="bi bi-mortarboard-fill text-white fs-5"></i>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="fw-bold fs-6 text-white text-truncate">
                            {brandingForm.appName || "CaseTrack"}
                          </div>
                          <div className="small text-white-50 text-truncate" style={{ fontSize: "0.75rem" }}>
                            {brandingForm.campusSubtitle || "by Iqra University"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Preview 2: Browser Tab / Favicon Preview */}
                    <div className="p-3 border rounded bg-body-tertiary">
                      <div className="small text-muted mb-2 text-uppercase" style={{ fontSize: "0.68rem", letterSpacing: "1px" }}>
                        Browser Tab &amp; Title Preview
                      </div>
                      <div className="d-flex align-items-center gap-2 p-2 rounded bg-body border shadow-sm">
                        <div style={{ width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {brandingForm.logoType === "custom" && brandingForm.logoUrl ? (
                            <img
                              src={brandingForm.logoUrl}
                              alt="Favicon"
                              style={{ width: "16px", height: "16px", objectFit: "contain" }}
                            />
                          ) : (
                            <i className="bi bi-mortarboard-fill text-primary" style={{ fontSize: "14px" }}></i>
                          )}
                        </div>
                        <span className="small text-body fw-medium text-truncate" style={{ fontSize: "0.78rem" }}>
                          {brandingForm.appName || "CaseTrack"} - Student Case Management System | {brandingForm.campusSubtitle || "by Iqra University"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Branding Action Buttons */}
                <div className="d-flex justify-content-end align-items-center gap-2 mt-4 pt-3 border-top">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCancelBranding}
                    disabled={!brandingChanged || isSavingBranding}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm d-inline-flex align-items-center gap-2"
                    disabled={isSavingBranding}
                  >
                    {isSavingBranding ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg"></i>
                        <span>Save &amp; Apply Branding</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CARD 2: GENERAL APPLICATION CONFIGURATION
            ========================================================================= */}
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-body py-3">
              <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <i className="bi bi-sliders text-primary"></i>
                <span>General Preferences</span>
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSaveSettings}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Default Operator / Officer Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formState.operatorName}
                    onChange={(e) => setFormState({ ...formState, operatorName: e.target.value })}
                    placeholder="e.g., Admin Officer"
                  />
                  <div className="form-text small">Recorded in immutable audit history logs for all dispatches.</div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold">Default Table Page Size</label>
                    <select
                      className="form-select"
                      value={formState.pageSize}
                      onChange={(e) => setFormState({ ...formState, pageSize: Number(e.target.value) })}
                    >
                      <option value={10}>10 records per page</option>
                      <option value={25}>25 records per page</option>
                      <option value={50}>50 records per page</option>
                      <option value={100}>100 records per page</option>
                    </select>
                  </div>

                  <div className="col-12 col-sm-6">
                    <label className="form-label small fw-semibold">Color Theme</label>
                    <select
                      className="form-select"
                      value={formState.theme}
                      onChange={(e) => setFormState({ ...formState, theme: e.target.value })}
                    >
                      <option value="light">Light Theme (Default)</option>
                      <option value="dark">Dark Theme</option>
                    </select>
                  </div>
                </div>

                <div className="d-flex justify-content-end">
                  <button type="submit" className="btn btn-primary d-inline-flex align-items-center gap-2">
                    <i className="bi bi-check-lg"></i>
                    <span>Save Preferences</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CARD 3: 100 GB STORAGE VOLUME & DIAGNOSTICS
            ========================================================================= */}
        <div className="col-12 col-lg-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-body py-3 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <i className="bi bi-hdd-network text-primary"></i>
                <span>100 GB Storage Volume</span>
              </h5>
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none p-0 text-muted"
                title="Refresh Storage Metrics"
                onClick={refreshStorageMetrics}
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-1 small">
                <span className="text-secondary">Target Capacity</span>
                <span className="fw-bold">{storageMetrics?.targetCapacityFormatted || "100.00 GB"}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-1 small">
                <span className="text-secondary">Used Storage</span>
                <span className="fw-bold text-primary">
                  {storageMetrics?.usedFormatted || `${storageKB} KB`} ({storageMetrics?.usagePercent ?? 0}%)
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2 small">
                <span className="text-secondary">Available Space</span>
                <span className="fw-bold text-success">
                  {storageMetrics?.availableFormatted || "--"}
                </span>
              </div>

              <div className="progress mb-3" style={{ height: "8px" }}>
                <div
                  className="progress-bar bg-primary"
                  role="progressbar"
                  style={{ width: `${Math.max(1, storageMetrics?.usagePercent || 0.1)}%` }}
                  title={`${storageMetrics?.usedFormatted || "0 B"} used of 100 GB`}
                ></div>
              </div>

              <div className="row g-2 mb-3 small">
                <div className="col-4">
                  <div className="p-2 border rounded bg-body-tertiary text-center">
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>Documents</div>
                    <div className="fw-bold text-body">{storageMetrics?.breakdown?.studentDocuments?.formatted || "--"}</div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 border rounded bg-body-tertiary text-center">
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>Database</div>
                    <div className="fw-bold text-body">{storageMetrics?.breakdown?.database?.formatted || "--"}</div>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 border rounded bg-body-tertiary text-center">
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>Backups</div>
                    <div className="fw-bold text-body">{storageMetrics?.breakdown?.backups?.formatted || "--"}</div>
                  </div>
                </div>
              </div>

              <div className="small text-muted mb-3">
                Current records: <strong>{database.students?.length || 0}</strong> students &bull;{" "}
                <strong>{database.history?.length || 0}</strong> history events &bull;{" "}
                Disk Free: <strong>{storageMetrics?.physicalDrive?.freeFormatted || "--"}</strong>.
              </div>

              <div className="d-flex flex-column gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-between"
                  onClick={handleClearNotifications}
                  disabled={notifications.length === 0}
                >
                  <span>Clear Notifications ({notifications.length})</span>
                  <i className="bi bi-bell-slash"></i>
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary d-inline-flex align-items-center justify-content-between"
                  onClick={handleExportDiagnostics}
                >
                  <span>Export Diagnostic Support Bundle</span>
                  <i className="bi bi-bug"></i>
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-success d-inline-flex align-items-center justify-content-between"
                  onClick={handleSeedDemoData}
                >
                  <span>Load Sample Demo Data</span>
                  <i className="bi bi-box-arrow-in-down"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
