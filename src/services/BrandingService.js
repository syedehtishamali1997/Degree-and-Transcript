/**
 * src/services/BrandingService.js
 * Centralized service managing dynamic CaseTrack application branding.
 * Handles application name, campus subtitle, custom logo uploads, favicon updates, and DOM reflection.
 */

export const DEFAULT_FAVICON_SVG =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%235856d6'><path d='M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z'/></svg>";

export const DEFAULT_BRANDING = {
  appName: "CaseTrack",
  campusSubtitle: "by Iqra University",
  logoType: "default", // "default" | "custom"
  logoUrl: null,       // Base64 data URI or image URL
  faviconUrl: null,
  updatedAt: null
};

export const ALLOWED_LOGO_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg", ".ico"];
export const ALLOWED_LOGO_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon"
];
export const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB max

export const BrandingService = {
  getDefaultBranding() {
    return { ...DEFAULT_BRANDING };
  },

  normalizeBranding(branding) {
    if (!branding || typeof branding !== "object") {
      return { ...DEFAULT_BRANDING };
    }
    return {
      appName: String(branding.appName || DEFAULT_BRANDING.appName).trim() || DEFAULT_BRANDING.appName,
      campusSubtitle: String(branding.campusSubtitle || DEFAULT_BRANDING.campusSubtitle).trim(),
      logoType: branding.logoType === "custom" && branding.logoUrl ? "custom" : "default",
      logoUrl: branding.logoUrl || null,
      faviconUrl: branding.faviconUrl || branding.logoUrl || null,
      updatedAt: branding.updatedAt || null
    };
  },

  /**
   * Dynamically applies branding configuration to document title and browser favicon
   */
  applyBrandingToDom(branding) {
    if (typeof document === "undefined") return;

    const normalized = this.normalizeBranding(branding);

    // 1. Update Document Title
    const titleText = `${normalized.appName} - Student Case Management System | ${normalized.campusSubtitle}`;
    document.title = titleText;

    // 2. Update Browser Favicon (<link rel="icon">)
    try {
      let link = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "shortcut icon";
        document.head.appendChild(link);
      }

      if (normalized.logoType === "custom" && normalized.logoUrl) {
        link.type = normalized.logoUrl.startsWith("data:image/svg+xml")
          ? "image/svg+xml"
          : "image/png";
        link.href = normalized.logoUrl;
      } else {
        link.type = "image/svg+xml";
        link.href = DEFAULT_FAVICON_SVG;
      }
    } catch (e) {
      console.warn("Could not update document favicon:", e);
    }
  },

  /**
   * Validates uploaded logo file for security, mime type, and dimensions
   */
  validateLogoFile(file) {
    if (!file) {
      return { valid: false, error: "No file selected." };
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      return { valid: false, error: "Logo file size must not exceed 5 MB." };
    }

    const name = file.name.toLowerCase();
    const hasValidExt = ALLOWED_LOGO_EXTENSIONS.some((ext) => name.endsWith(ext));
    const hasValidMime = ALLOWED_LOGO_MIME_TYPES.includes(file.type);

    if (!hasValidExt && !hasValidMime) {
      return {
        valid: false,
        error: "Invalid file format. Allowed formats: PNG, JPG, JPEG, SVG, ICO."
      };
    }

    return { valid: true };
  },

  /**
   * Reads a logo file into base64 Data URL for persistent storage and immediate preview
   */
  readLogoAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const validation = this.validateLogoFile(file);
      if (!validation.valid) {
        return reject(new Error(validation.error));
      }

      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error("Failed to read logo file."));
      reader.readAsDataURL(file);
    });
  }
};
