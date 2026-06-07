import { ToastNotification } from "@carbon/react";
import { dismissToast, useToasts } from "../lib/toast.js";

/** Renders the global toast stack (bottom-right). */
export function ToastHost() {
  const toasts = useToasts();
  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 9000,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
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
