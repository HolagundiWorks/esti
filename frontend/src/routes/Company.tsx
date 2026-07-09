import { Navigate } from "react-router-dom";

/** Legacy workspace route — office administration lives on the company account portal. */
export function Company() {
  return <Navigate to="/company-account" replace />;
}
