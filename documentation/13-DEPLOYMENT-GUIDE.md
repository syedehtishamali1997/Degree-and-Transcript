# 13 - Deployment Guide

**Application:** CaseTrack - Student Case Management System  
**Organization:** Iqra University  

---

## 1. Prerequisites & Environment

- **Node.js:** v18.0.0 or higher (v24 LTS recommended)
- **Package Manager:** npm v9.0.0 or higher
- **Modern Web Browser:** Chrome 100+, Edge 100+, Firefox 100+, Safari 15+

---

## 2. Installation and Build

```bash
# 1. Install dependencies
npm install

# 2. Run local development server (with hot module replacement)
npm run dev

# 3. Compile optimized production build into dist/
npm run build

# 4. Preview compiled production build locally
npm run preview
```

---

## 3. Production Deployment Options

Because CaseTrack compiles into standard static assets with relative path references (`base: "./"` in `vite.config.js`) and client-side hash routing (`HashRouter`), it can be deployed on any static hosting environment without requiring server rewrites or reverse proxies.

### Option A: Local Campus Intranet / Shared Network Drive
1. Run `npm run build`.
2. Copy the contents of the `dist/` directory to the target server or shared intranet directory.
3. Serve using any lightweight static web server (e.g. Nginx, Apache, or Node `http-server`).

### Option B: Firebase Hosting
```bash
# Install Firebase CLI if not present
npm install -g firebase-tools

# Login and deploy
firebase login
firebase init hosting # Set public directory to "dist"
firebase deploy --only hosting
```

### Option C: GitHub Pages
1. Build the production package: `npm run build`.
2. Push the contents of the `dist/` folder to the `gh-pages` branch.
3. Access via `https://<organization>.github.io/<repository-name>/`.

---

## 4. Security & Storage Persistence Best Practices

- **HTTPS Requirement:** Deploy on an HTTPS origin to ensure browser LocalStorage is sandboxed and encrypted at rest on the client workstation.
- **Regular Backups:** Campus administrators should schedule weekly JSON backups via **Data Management > Export Complete JSON Backup** to safeguard against accidental workstation clearing.
