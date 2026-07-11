import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import type { ReactNode } from "react";

/**
 * ConfirmModal — the ONE confirmation pattern for destructive actions (HCW
 * interaction contract: destroy always confirms; never `window.confirm`).
 * Render it controlled:
 *
 *   const [confirm, setConfirm] = useState<null | (() => void)>(null);
 *   <Button onClick={() => setConfirm(() => () => remove.mutate({ id }))}>Remove</Button>
 *   <ConfirmModal open={!!confirm} … onConfirm={() => { confirm?.(); setConfirm(null); }} />
 *
 * Promoted from the app (2026-07). Carries `aria-labelledby` so the dialog has an
 * accessible name (WCAG 4.1.2).
 */
export function ConfirmModal({
  open,
  heading = "Are you sure?",
  body,
  confirmText = "Delete",
  danger = true,
  pending = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  heading?: string;
  body: ReactNode;
  confirmText?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="confirm-modal-title">
      <DialogTitle id="confirm-modal-title">{heading}</DialogTitle>
      <DialogContent>{typeof body === "string" ? <p>{body}</p> : body}</DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="text" color="inherit">
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={pending}
          variant="contained"
          color={danger ? "error" : "primary"}
        >
          {pending ? "Working…" : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ConfirmModal;
