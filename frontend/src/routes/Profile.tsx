import { Navigate } from "react-router-dom";

/** Legacy workspace route — profile lives on the personal account portal. */
export function Profile() {
  return <Navigate to="/account#profile" replace />;
}
