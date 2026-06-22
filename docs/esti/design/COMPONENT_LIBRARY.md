# COMPONENT LIBRARY — ESTI AORMS

This document catalogues every Carbon component in use across the ESTI frontend, which screens use each one, and recommendations for additional Carbon components that should be adopted.

---

## Carbon Components in Active Use

### Layout & Structure

| Component | Files using it | Notes |
|---|---|---|
| `Grid` | Team.tsx, AuditLog.tsx, Performance.tsx, dashboardUi.tsx | Always use `narrow` or `condensed` prop to reduce gutter |
| `Column` | Team.tsx, AuditLog.tsx, Performance.tsx, dashboardUi.tsx | Follows 16-col (lg), 8-col (md), 4-col (sm) breakpoints |
| `Stack` | All 27 route files, PageHeader.tsx, DataState.tsx | Primary layout primitive — use `gap` prop not margin |
| `Content` | App.tsx | Main page content wrapper |
| `Theme` | App.tsx, Login route | g100 for office shell; white for portals |

### Navigation

| Component | Files using it | Notes |
|---|---|---|
| `Header` | App.tsx | Office shell top bar |
| `HeaderName` | App.tsx | Firm name with ESTI mark |
| `HeaderGlobalBar` | App.tsx | Right-side actions area |
| `HeaderGlobalAction` | App.tsx | Logout button |
| `SideNav` | App.tsx | Rail navigation |
| `SideNavItems` | App.tsx | Nav item container |
| `SideNavLink` | App.tsx | Top-level nav links (Dashboard, Projects, Work, etc.) |
| `SideNavMenu` | App.tsx | Grouped nav sections (People, Accounting, Office, Admin) |
| `SideNavMenuItem` | App.tsx | Items within nav groups |
| `Tabs` | Dashboard.tsx, ProjectDetail.tsx, Work.tsx, KnowledgeBank.tsx, Performance.tsx, Filing.tsx, Hr.tsx | URL-synced tab navigation |
| `TabList` | Same as Tabs | Use `contained` variant for page-level tabs |
| `Tab` | Same as Tabs | |
| `TabPanel` | Same as Tabs | Set `style={{ padding: 0 }}` on Dashboard tabs |
| `TabPanels` | Same as Tabs | |

### Data Display

| Component | Files using it | Notes |
|---|---|---|
| `DataTable` | Projects.tsx, Clients.tsx, Consultants.tsx | Use for sortable/searchable lists |
| `Table` | All list screens | Direct table when sorting not needed |
| `TableContainer` | All list screens | Always wrap Table in TableContainer |
| `TableHead` | All list screens | |
| `TableHeader` | All list screens | |
| `TableBody` | All list screens | |
| `TableRow` | All list screens | |
| `TableCell` | All list screens | |
| `TableToolbar` | Projects.tsx, Clients.tsx, Consultants.tsx | Search + filter bar above table |
| `TableToolbarContent` | Same | |
| `TableToolbarSearch` | Same | Use `persistent` prop |
| `Pagination` | Projects.tsx, Clients.tsx, AuditLog.tsx | |
| `Tag` | All screens | Status badges — use semantic type colors |
| `ProgressBar` | Dashboard.tsx | Team capacity and project progress |
| `CodeSnippet` | AuditLog.tsx | JSON diff display |
| `DataTableSkeleton` | DataState.tsx (shared) | Loading state for all list screens |

### Inputs & Forms

| Component | Files using it | Notes |
|---|---|---|
| `Button` | All screens | Primary action; use `kind` prop correctly |
| `TextInput` | All form screens | Standard single-line text |
| `TextArea` | FeeProposals.tsx, Proposals.tsx, Letters.tsx, Contracts.tsx, Performance.tsx, Hr.tsx | Multi-line text |
| `Select` + `SelectItem` | All form screens | Dropdown selection |
| `Checkbox` | Invoices.tsx, Portal.tsx | Binary option |
| `Toggle` | Company.tsx, Performance.tsx | Module enable/disable switches |
| `Search` | Team.tsx, KnowledgeBank.tsx | In-page search input |
| `NumberInput` | Performance.tsx | Numeric entry with stepper |
| `FileUploaderButton` | Company.tsx, Reconcile.tsx | File selection |

### Feedback & Overlays

| Component | Files using it | Notes |
|---|---|---|
| `Modal` | All form screens | Create/edit dialogs and confirmation |
| `InlineNotification` | All form screens | Success/error banners |
| `InlineLoading` | Dashboard.tsx, Settings.tsx | Inline async state |
| `Loading` | App.tsx, ProjectDetail.tsx | Full overlay loading |
| `Tile` | Many screens | Static content containers |
| `ClickableTile` | Portal.tsx, dashboardUi.tsx | Interactive content tiles |

### Icons

| Component | Source | Usage |
|---|---|---|
| `Building`, `Calendar`, `Catalog`, `Dashboard` | `@carbon/icons-react` | SideNav icons |
| `Document`, `Enterprise`, `Logout` | `@carbon/icons-react` | SideNav icons |
| `Money`, `Notification`, `Search` | `@carbon/icons-react` | SideNav icons |
| `TaskComplete`, `UserMultiple` | `@carbon/icons-react` | SideNav icons |
| `UserAvatar` | `@carbon/icons-react` | Settings profile |
| `ArrowRight` | `@carbon/icons-react` | dashboardUi.tsx tile navigation cue |
| `Trophy`, `UserProfile`, `Analytics` | `@carbon/icons-react` | Performance.tsx |

### Charts

| Component | Source | Usage |
|---|---|---|
| `MeterChart` | `@carbon/charts-react` | Performance KPI meters in Performance.tsx |

---

## Shared ESTI Components (Wrapping Carbon)

These are project-level components built on Carbon primitives. Do not re-implement their patterns inline.

| Component | Location | Wraps |
|---|---|---|
| `PageHeader` | `components/PageHeader.tsx` | `Stack` — h1 + description + actions |
| `DataState` | `components/DataState.tsx` | `DataTableSkeleton`, `Tile`, `Stack` |
| `ConfirmModal` | `components/ConfirmModal.tsx` | `Modal` |
| `PeriodFilter` | `components/PeriodFilter.tsx` | `Select`, `SelectItem` |
| `ZoneTile` | `components/dashboard/dashboardUi.tsx` | `Tile`, `ClickableTile` |
| `KpiChip` | `components/dashboard/dashboardUi.tsx` | `Tile`, `ClickableTile` |
| `FilingTile` | `components/dashboard/dashboardUi.tsx` | `ClickableTile`, `Tag` |
| `AlertsBell` | `components/AlertsBell.tsx` | `HeaderGlobalAction` |
| `UserIdCard` | `components/UserIdCard.tsx` | `HeaderGlobalAction` |
| `StaffAvatar` | `components/StaffAvatar.tsx` | Pure utility: initials + colour derivation |

---

## Recommended Additions (not yet adopted)

| Carbon Component | Why needed | Screens to apply |
|---|---|---|
| `Breadcrumb` / `BreadcrumbItem` | Project detail back-navigation uses plain text link — Carbon Breadcrumb is the correct pattern | ProjectDetail.tsx header |
| `DatePicker` / `DatePickerInput` | Date fields use `<TextInput type="date">` — Carbon DatePicker provides locale formatting and accessible picker | All date fields in forms |
| `MultiSelect` | Several filter UIs allow only one selection — MultiSelect needed for tag/status filters | Projects, Work, Invoices filter toolbars |
| `OverflowMenu` | Row action buttons (Delete, Edit) should use OverflowMenu in table cells rather than ghost Buttons stacked horizontally | AuditLog, Invoices, Contracts, Letters |
| `Accordion` | Company settings stacks Tiles vertically — Accordion would reduce scroll depth | Company.tsx module sections |
| `StructuredList` | Company.tsx imports `StructuredListWrapper` but it is not from `@carbon/react` v11 — use `Table size="sm"` instead | Company.tsx archive history |
| `Notification` (toast) | Toast host exists in `styles.scss` but no Carbon ToastNotification used | Post-mutation success toasts |
