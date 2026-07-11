import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { pushToast } from "../lib/toast.js";

/** Redirect removed modules with an informative toast instead of a silent hop. */
export function LegacyModuleRedirect({
  to,
  title,
  subtitle,
}: {
  to: string;
  title: string;
  subtitle?: string;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    pushToast({ kind: "info", title, subtitle });
    navigate(to, { replace: true });
  }, [navigate, subtitle, title, to]);

  return null;
}
