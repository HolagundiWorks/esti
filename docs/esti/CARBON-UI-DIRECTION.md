# Carbon UI Direction

## Objective

ESTI should move toward a Carbon-inspired interface using IBM blue and a focused
light/dark mode system, while preserving Dolibarr's proven ERP workflows.

This is a redesign direction, not a first-step rewrite. The implementation
should begin with an ESTI theme and reusable templates before core UI changes.

## Design Principles

- Use IBM blue as the primary brand color.
- Provide light and dark modes only.
- Remove theme marketplace/customization from the ESTI distribution profile.
- Keep dense ERP screens readable for repeated operational use.
- Prefer tables, filters, tabs, side panels, and clear action bars over
  marketing-style layouts.
- Keep forms compact and predictable for keyboard-heavy users.
- Preserve Dolibarr accessibility and translation behaviour.

## Theme Scope

Initial theme work should cover:

- Login screen.
- Main navigation.
- List pages.
- Object detail pages.
- Forms and validation states.
- Buttons, tabs, badges, alerts, filters, and modals.
- Construction dashboards and project cost views.

## Implementation Guardrails

- Avoid introducing Carbon packages until dependency and GPL compatibility are
  reviewed.
- Start with CSS and template alignment rather than a full frontend framework.
- Use Dolibarr hooks and theme extension points where possible.
- Keep JavaScript in separate files under the relevant module or theme path.
- Verify UI changes on common ERP workflows: estimate creation, BOQ editing,
  purchase order creation, stock issue, and billing.

## Proposed Color Tokens

```text
Primary: IBM blue family
Background light: white/neutral gray
Background dark: near-black neutral
Success: green
Warning: yellow/orange
Danger: red
Information: blue
```

Avoid one-note blue screens. Blue should identify actions and navigation, while
content areas remain neutral and readable.
