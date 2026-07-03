// Standalone licensing-console entry (admin.DOMAIN). Built from admin.html as
// its own Vite entry, deployed by deploy/install-admin-console.sh: the admin
// vhost serves this bundle and proxies /platform/ to the same box's backend,
// so every API call is same-origin (no CORS or cookie tricks needed). The
// Panel component is the same client the embedded /platform-admin fallback
// uses — one console codebase, two mounts.
import "./styles.scss";
import React from "react";
import ReactDOM from "react-dom/client";
import Panel from "./platform-admin/Panel.js";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Panel />
  </React.StrictMode>,
);
