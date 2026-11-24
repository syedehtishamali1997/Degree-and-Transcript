# CaseTrack - Theme System & Design Tokens Documentation
### CoreUI 5 Theming, Light/Dark Modes & Pure Black Sidebar Standards (v2.2.0)

This document specifies the theming engine, CSS custom properties (design tokens), contrast standards, and persistence mechanisms of **CaseTrack**.

---

## 1. Theming Architecture

CaseTrack implements a dual-theme architecture based on CoreUI 5 and Bootstrap 5 design tokens:
- **Light Theme**: Clean, high-legibility enterprise aesthetic for day-to-day administrative desk operations.
- **Dark Theme**: Modern low-light aesthetic reducing eye fatigue during extended evening shifts.
- **Universal Pure Black Sidebar**: Regardless of whether Light or Dark theme is active, the left navigation sidebar strictly maintains its signature pure black (`#000000`) background with clean white typography.

---

## 2. Theme Switching & DOM Application Mechanism

The theme mode is tracked in the centralized React state (`CaseTrackContext.jsx`) under `settings.theme`.

```jsx
// src/context/CaseTrackContext.jsx
useEffect(() => {
  const mode = settings.theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-bs-theme", mode);
  document.documentElement.setAttribute("data-coreui-theme", mode);
}, [settings.theme]);
```

When an operator toggles the theme via the top header or settings page:
1. `updateSettings({ theme })` mutates the React database state.
2. The `useEffect` hook updates both `data-bs-theme` and `data-coreui-theme` attributes on `<html>`.
3. `StorageService` synchronizes the new preference to browser `LocalStorage` under `casetrack_db_v2`.
4. On future page reloads or returns to the application, the saved theme is restored instantly during initial state hydration.

---

## 3. Design Tokens & Color Palettes

### 3.1 Light Theme Tokens (`[data-bs-theme="light"]`)

```css
:root,
[data-bs-theme="light"],
[data-coreui-theme="light"] {
  /* Surfaces & Backgrounds */
  --cui-body-bg: #f3f4f7;
  --cui-surface-bg: #ffffff;
  --cui-surface-subtle: #f8f9fa;
  --cui-surface-hover: #eef1f5;

  /* Typography */
  --cui-body-color: #252b36;
  --cui-heading-color: #181924;
  --cui-text-muted: #6d7d9c;
  --cui-border-color: #dbdfe6;
  --cui-border-subtle: #e7eaee;

  /* Primary Accent & Branding */
  --cui-primary: #5856d6;
  --cui-primary-rgb: 88, 86, 214;
  --cui-primary-subtle: rgba(88, 86, 214, 0.12);
  --cui-primary-border-subtle: #9d92e6;

  /* Universal Pure Black Sidebar */
  --cui-sidebar-bg: #000000;
  --cui-sidebar-color: #ffffff;
  --cui-sidebar-border: #1a1a1a;
  --cui-sidebar-hover-bg: rgba(255, 255, 255, 0.08);
  --cui-sidebar-active-bg: rgba(255, 255, 255, 0.14);
}
```

### 3.2 Dark Theme Tokens (`[data-bs-theme="dark"]`)

```css
[data-bs-theme="dark"],
[data-coreui-theme="dark"] {
  /* Surfaces & Backgrounds */
  --cui-body-bg: #1d222b;
  --cui-surface-bg: #282d37;
  --cui-surface-subtle: #212631;
  --cui-surface-hover: #323a49;

  /* Typography */
  --cui-body-color: rgba(255, 255, 255, 0.87);
  --cui-heading-color: #ffffff;
  --cui-text-muted: #8a93a2;
  --cui-border-color: #323a49;
  --cui-border-subtle: #2a303d;

  /* Primary Accent & Branding */
  --cui-primary: #6f42c1;
  --cui-primary-rgb: 111, 66, 193;

  /* Universal Pure Black Sidebar */
  --cui-sidebar-bg: #000000;
  --cui-sidebar-color: #ffffff;
  --cui-sidebar-border: #1a1a1a;
  --cui-sidebar-hover-bg: rgba(255, 255, 255, 0.08);
  --cui-sidebar-active-bg: rgba(255, 255, 255, 0.14);
}
```

---

## 4. Contrast & Accessibility (WCAG 2.1 AA)

- **Pure Black Sidebar**: White text (`#ffffff`) on pure black (`#000000`) provides a contrast ratio of **21:1** (exceeding AAA standard).
- **Light Theme**: Dark grey text (`#252b36`) on light grey background (`#f3f4f7`) delivers an **11.2:1** contrast ratio.
- **Dark Theme**: Off-white text (`rgba(255, 255, 255, 0.87)`) on dark grey background (`#1d222b`) delivers a **12.4:1** contrast ratio.
- **Stage Badges**: All stage badges utilize subtle colored backgrounds paired with high-contrast text and border tokens:
  - Pending: Grey subtle with dark grey text.
  - Case Ready: Blue subtle with navy blue text.
  - Sent: Orange subtle with dark amber text.
  - Returned: Red subtle with dark crimson text.
  - Received: Green subtle with dark forest green text.

---

## 5. Automated Theme Audit Verification

The test suite `npm run test:audit` verifies:
1. Dynamic switching between Light and Dark themes via UI dropdown interaction.
2. Accurate presence of `data-bs-theme` and `data-coreui-theme` on `document.documentElement`.
3. Computed style assertions confirming expected surface and body colors in both modes.
4. Immediate persistence in `localStorage` and seamless rehydration upon page reload.
