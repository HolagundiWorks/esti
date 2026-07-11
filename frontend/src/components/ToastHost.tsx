import { Alert, AlertTitle } from "@mui/material";
import { dismissToast, useToasts } from "../lib/toast.js";

/** Renders the global toast stack (bottom-right). Material UI. */
export function ToastHost() {
  const toasts = useToasts();
  return (
    <div className="esti-toast-host" role="status" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <Alert
          key={t.id}
          severity={t.kind}
          variant="filled"
          onClose={() => dismissToast(t.id)}
        >
          <AlertTitle>{t.title}</AlertTitle>
          {t.subtitle}
        </Alert>
      ))}
    </div>
  );
}
