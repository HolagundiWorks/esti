# React / Carbon UI Migration

This is the starting scaffold for moving ESTI from the inherited PHP UI to a
React-first Carbon interface for the ESTI Architect Platform.

## Entry Point

- React shell: `htdocs/estiui/index.php`
- React app: `htdocs/estiui/assets/app.js`
- Carbon layout CSS: `htdocs/estiui/assets/app.css`
- Runtime URL: `/estiui/`

## Migration Strategy

1. Keep Dolibarr PHP as the authenticated backend and service layer.
2. Mount React screens inside Dolibarr routes while modules are migrated.
3. Replace architect-office workflows first: dashboard, clients, projects,
   phases, fee proposals, drawings, permits, invoices, consultants, and client
   portal.
4. Keep DSR/SOR and BOQ screens as supporting reference/costing workflows.
5. Convert legacy pages into API-backed React screens one workflow at a time.
6. Remove old PHP screens only after the React replacement is functionally complete and permission-safe.

## UI Rules

- Use Carbon 2x spacing and a four-column workspace grid.
- Use IBM Plex and the existing ESTI blue/dark-light token layer.
- Use React for new screen composition.
- Keep Dolibarr hooks, permissions, CSRF, and database access patterns intact on the backend.
