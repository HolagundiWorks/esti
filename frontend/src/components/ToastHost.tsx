import { ToastNotification } from "@carbon/react";
import { dismissToast, useToasts } from "../lib/toast.js";

/** Renders the global toast stack (bottom-right). */
export function ToastHost() {
  const toasts = useToasts();
  return (
    <div className="esti-toast-host">
      {toasts.map((t) => (
        <ToastNotification
          key={t.id}
          kind={t.kind}
          title={t.title}
          subtitle={t.subtitle}
          lowContrast
          onCloseButtonClick={() => dismissToast(t.id)}
        />
      ))}
    </div>
  );
}
