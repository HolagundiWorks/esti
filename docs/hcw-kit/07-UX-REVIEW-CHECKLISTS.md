# UX review checklists — measurable rules per pattern

Principles live in [HCW-UI-UX-PRINCIPLES.md](../esti/HCW-UI-UX-PRINCIPLES.md);
these are the **countable** audit items per pattern. Each item is pass/fail with
`file:line` evidence. Extend items as audits discover new failure modes.

## Navigation
- [ ] Chrome matches NAVIGATION.md exactly (no undocumented entries)
- [ ] No menu > 7±2 items without labelled grouping (`ListSubheader`)
- [ ] Active route: visual cue + `aria-current="page"`
- [ ] Every route sets `document.title` (breadcrumb or SEO effect)
- [ ] Breadcrumb on every screen deeper than a top-level module
- [ ] Keyboard: menus open/navigate/close via Enter/arrows/Escape
- [ ] Search reachable from chrome + Ctrl/Cmd-K (guarded against inputs)
- [ ] Most-used destinations first/last in their group (serial position)

## Forms
- [ ] Every input has a programmatic label (no placeholder-as-label)
- [ ] Required fields marked; validation inline at field level (`error` + `helperText`)
- [ ] Client-side format checks mirror server rules (no learn-by-round-trip)
- [ ] `autoComplete` on identity fields; `new-password` when setting for others
- [ ] Submit disables while pending, with progress verb ("Saving…")
- [ ] Error text = what failed + next step
- [ ] Escape/Cancel path exists and is honest (no silent data loss)
- [ ] Logical field order (email before password; grouped by topic)

## Tables / data grids
- [ ] ≤8 columns per grid; overflow scrolls in-container (never the page)
- [ ] Loading = skeleton (DataState); empty = one sentence + one action
- [ ] Status rendered as StatusDot (never filled colour chips)
- [ ] Row actions keyboard-reachable; row click has keyboard equivalent
- [ ] Column headers use the structural label style (uppercase, letterspaced)
- [ ] Money via formatINR; dates en-IN

## CRUD
- [ ] Create/commit/destroy via dock zones (centre/right/left); `[]` while dialog open
- [ ] No inline duplicate of a dock action
- [ ] Destroy confirms via ConfirmModal with the object named
- [ ] Success = toast; failure = contextual message
- [ ] After create: focus/scroll lands on the new record
- [ ] Optimistic write on low-risk toggles (or a stated reason why not)

## Search & filters
- [ ] Search field labelled; results announce count
- [ ] "No results" state offers query correction or reset
- [ ] Filters show active state and are individually clearable
- [ ] Filter set ≤7 visible; overflow behind progressive disclosure
- [ ] Sort state visible in the header it applies to

## Dialogs
- [ ] `aria-labelledby` names every dialog
- [ ] Focus trapped, initial focus meaningful, Escape closes, focus restored
- [ ] One primary action, verb-first; Cancel is text/neutral
- [ ] Dock yields (`[]`) while open
- [ ] Destructive variant uses danger colour + ConfirmModal semantics

## Notifications / toasts
- [ ] One host (kit ToastHost); no bespoke stacks
- [ ] Success confirms every state-changing action that lacks visible inline effect
- [ ] Errors are specific (what failed), never bare "Something went wrong"
- [ ] Deduped; auto-dismiss ≥4s; dismissible; `role="status"` live region
- [ ] Severity uses tinted-glass alerts only for error/warning (Layer 3 scarcity)

## Wizards / multi-step
- [ ] Progress indicator with step names (goal gradient)
- [ ] Back never loses entered data
- [ ] Each step ≤7 inputs (Miller); review step before commit
- [ ] Commit is the dock RIGHT action; abandon confirms if dirty

## Reports / documents
- [ ] Generation shows determinate progress or honest busy state
- [ ] Output actions (view/download) appear in place, keyboard-reachable
- [ ] Failures name the failing artefact and retry path
- [ ] Long tables paginate or virtualise; print/PDF styles verified

## Dashboards
- [ ] ≤4 KPIs visible without scroll; drill-down on each
- [ ] Zone health encodes state by shape + colour (never colour alone)
- [ ] Every number traceable (click-through to source records)
- [ ] Skeletons sized to final layout (no reflow jump)
- [ ] Rail = identity/telemetry/filters only; no data tables in the rail
