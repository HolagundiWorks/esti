import { Navigate } from "react-router-dom";

/** Legacy workspace route — settings live on the personal account portal. */
export function Settings() {
  return <Navigate to="/account#settings" replace />;
}
