# 10 - UI/UX and Design System

**Application:** CaseTrack - Student Case Management System  
**Organization:** Iqra University  

---

## 1. Design System & Visual Philosophy

CaseTrack pairs the structured layout principles of **CoreUI 5** with a modern custom dark sidebar theme:
1. **Pure Black Left Sidebar (`#000000`):** Provides sharp visual separation for navigation, keeping operational controls distinct from content areas. Navigation links are rendered in pure white (`#ffffff`) with subtle dark grey dividers and muted section headings (`#9ca3af`).
2. **Purple Academic Branding (`#6f42c1`):** Represents Iqra University's identity across primary action buttons, active navigation indicators, and branding badges.
3. **High-Contrast Data Display:** Crisp data tables with distinct zebra striping, sticky table headers, and color-coded status chips to ensure rapid legibility.

---

## 2. Color Palette & Design Tokens

### Core Color Tokens

| Token Name | Hex Code | Purpose & Usage |
| :--- | :--- | :--- |
| `--cui-primary` | `#6f42c1` | Primary university brand color, action buttons, active tabs |
| `--cui-sidebar-bg` | `#000000` | Pure black sidebar background |
| `--cui-sidebar-color` | `#ffffff` | Pure white navigation item text |
| `--cui-sidebar-hover-bg` | `rgba(255, 255, 255, 0.08)` | Sidebar hover highlight |
| `--cui-sidebar-active-bg`| `rgba(255, 255, 255, 0.14)` | Sidebar active route highlight |
| `--cui-body-bg` | `#f8f9fa` | Light theme page canvas background |
| `--cui-body-color` | `#212529` | High-contrast body text |
| `--cui-border-color` | `#e5e7eb` | Subtle card, table, and input borders |

### Stage Badge Color Matrix

| Workflow Stage | Badge CSS Class | Background Hex | Text Hex | Icon |
| :--- | :--- | :--- | :--- | :--- |
| **Pending** | `badge-grey` / `status-pending` | `#6c757d` | `#ffffff` | `bi-hourglass-split` |
| **Case Ready** | `badge-blue` / `status-ready` | `#0d6efd` | `#ffffff` | `bi-check2-circle` |
| **Sent to Main Campus** | `badge-orange` / `status-sent` | `#fd7e14` | `#ffffff` | `bi-send` |
| **Returned from Main Campus**| `badge-red` / `status-returned` | `#dc3545` | `#ffffff` | `bi-arrow-return-left`|
| **Received from Main Campus**| `badge-green` / `status-received`| `#198754` | `#ffffff` | `bi-check-all` |

---

## 3. Responsive Breakpoint Standards

The application layout adapts gracefully across all standard screen sizes:

```
Breakpoint Matrix:
├── >= 1200px  : Full desktop (Sidebar 256px expanded or 72px collapsed)
├── 992px-1199px : Laptop / Desktop small (Compact tables, sticky action columns)
├── 768px-991px  : Tablet landscape / portrait (Sidebar transitions to off-canvas drawer)
├── 576px-767px  : Mobile landscape (Stacked KPI metrics, horizontal table scrolling)
└── < 576px      : Mobile portrait / 320px-390px (Full-width cards, optimized touch targets)
```

### Mobile Layout Optimizations:
- **Off-Canvas Navigation:** Replaces the desktop sidebar with a slide-out drawer triggered via the top hamburger button, complete with backdrop dismiss.
- **Scrollable Data Grids:** All tables are wrapped in `.table-responsive`, preventing viewport blowouts on narrow screens.
- **Touch-Friendly Controls:** Action buttons maintain minimum touch targets of 38px $\times$ 38px.
