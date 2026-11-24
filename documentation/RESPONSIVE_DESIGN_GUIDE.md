# CaseTrack - Comprehensive Responsive Design & Multi-Device Optimization Guide
### Architectural Standards for Cross-Device Compatibility (v2.2.0)

This guide documents the responsive design architecture, CSS media query hierarchy, breakpoint rules, touch target guidelines, and testing methodologies for **CaseTrack**.

---

## 1. Primary Design Objective

The core requirement of CaseTrack's responsive design system is:
**Zero horizontal window scroll (`scrollWidth <= innerWidth`) across all device viewports while strictly preserving the established desktop design and pure black sidebar branding.**

The system intelligently adapts data tables, header controls, stat cards, and modals across 13 distinct viewport resolutions.

---

## 2. Tested & Supported Viewport Spectrum

CaseTrack has been verified against 13 standard device viewports:

| Device Category | Viewport Resolution | Common Devices / Displays | Sidebar State | Header Layout |
| :--- | :--- | :--- | :--- | :--- |
| **Large Desktop** | 1920 x 1080 | Full HD Monitors, 24"-27" Screens | Fixed (256px) | Full (Clock, Quick Search, Theme, Profile) |
| **Desktop HD** | 1600 x 900 | High-DPI Laptops, 20" Monitors | Fixed (256px) | Full |
| **Standard Desktop** | 1440 x 900 | MacBook Pro 15", Standard Desktops | Fixed (256px) | Full |
| **Small Desktop / Laptop** | 1366 x 768 | Most Common Corporate Laptops | Fixed (256px) | Compact Clock, Search, Icons |
| **Compact Laptop** | 1280 x 800 | 13" Laptops, Ultraportables | Fixed (256px) | Search, Theme, Notifications, Profile |
| **Tablet Landscape / iPad** | 1024 x 768 | iPad 9th/10th Gen Landscape | Fixed (256px) | Search, Theme, Profile |
| **iPad Air Portrait** | 820 x 1180 | iPad Air / iPad Pro 11" Portrait | Off-Canvas Drawer | Hamburger, Search, Theme, Profile |
| **Tablet Portrait** | 768 x 1024 | Standard iPad Portrait | Off-Canvas Drawer | Hamburger, Search, Theme, Profile |
| **Large Mobile** | 430 x 932 | iPhone 14 / 15 / 16 Pro Max | Off-Canvas Drawer | Hamburger, Search Icon, Theme, Profile |
| **Standard Mobile** | 390 x 844 | iPhone 12 / 13 / 14 / 15 | Off-Canvas Drawer | Hamburger, Search Icon, Theme, Avatar |
| **Mobile SE** | 375 x 667 | iPhone SE, iPhone 8 | Off-Canvas Drawer | Hamburger, Compact Icons, Avatar |
| **Galaxy S20** | 360 x 780 | Samsung Galaxy S20 / S21 / S22 | Off-Canvas Drawer | Hamburger, Compact Icons, Avatar |
| **Compact Mobile** | 320 x 568 | iPhone 5 / SE 1st Gen, Small Devices | Off-Canvas Drawer | Minimal Icons, Compact Padding |

---

## 3. Breakpoint Hierarchy & Media Queries

Styles are organized across `css/responsive.css`, `css/style.css`, and page-scoped styles such as `src/pages/DataManagementPage.css`:

```css
/* 1. Large Desktop (>= 1440px) */
@media (min-width: 1440px) { ... }

/* 2. Desktop & Laptop (>= 992px) */
@media (min-width: 992px) {
  .sidebar-backdrop { display: none !important; }
}

/* 3. Tablet & Smaller (< 992px) - Trigger Off-Canvas Drawer */
@media (max-width: 991.98px) {
  .sidebar {
    position: fixed;
    transform: translateX(-100%);
    z-index: 1045;
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .main-content {
    margin-left: 0 !important;
  }
}

/* 4. Large Mobile (576px - 767.98px) */
@media (min-width: 576px) and (max-width: 767.98px) {
  .header-subtitle { display: none; }
}

/* 5. Mobile (< 576px) */
@media (max-width: 575.98px) {
  .header-main-bar { padding: 0 0.75rem; min-height: 54px; }
  .btn-icon { width: 34px; height: 34px; }
  .stat-card { padding: 0.85rem 0.75rem; min-height: 120px; }
}

/* 6. Ultra-Compact Mobile (< 375px) */
@media (max-width: 374.98px) {
  .stat-card { padding: 0.75rem 0.6rem; }
  .btn-icon { width: 32px; height: 32px; }
}
```

---

## 4. Off-Canvas Sidebar Drawer Architecture

- On screens `< 992px`, the desktop fixed sidebar switches to `position: fixed` with a negative X-transform (`transform: translateX(-100%)`).
- When toggled via the hamburger button in `AppHeader.jsx`, the class `.open` slides the sidebar in smoothly with a CSS transition.
- A backdrop overlay (`.sidebar-backdrop.show`) covers the main content. Tapping anywhere outside the drawer or selecting any navigation link automatically closes the drawer.
- On desktop (`>= 992px`), clicking the toggle icon switches the sidebar between standard width (`256px`) and collapsed mini-width (`72px`).

---

## 5. Table Horizontal Containment

- Data tables (`StudentRecordsTable`, `HistoryTable`, `ProgramReportTable`, and Data Management preview tables) are wrapped inside `.table-responsive` or `.sticky-table-wrapper`.
- Column text uses `text-nowrap` for critical identifiers and dates to prevent awkward vertical stacking.
- The table container scrolls horizontally on touch/drag while the page itself maintains `overflow-x: hidden` and `scrollWidth <= innerWidth`.

---

## 6. Touch Targets & Mobile Usability

- All interactive buttons, icon buttons, and form controls have a minimum touch target size of **36px to 44px**.
- Inputs and dropdown selects enforce `font-size: 16px` on mobile Safari/Chrome to prevent automatic viewport zoom.
- Dropdowns (Theme, Notifications, Profile) have responsive widths (`max-width: calc(100vw - 20px)`) to prevent viewport clipping.

---

## 7. Automated Responsive Test Verification

CaseTrack includes two automated browser responsive test suites:
- `npm run test:dm-resp`: Validates Data Management across 9 viewports.
- `npm run test:audit`: Validates all 10 application pages across 13 viewports.

Both suites enforce `scrollWidth <= innerWidth` with zero unhandled JavaScript exceptions.
