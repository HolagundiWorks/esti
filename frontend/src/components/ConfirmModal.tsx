import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import type { ReactNode } from "react";

/**
 * One confirmation pattern for destructive actions — replaces ad-hoc
 * `window.confirm` and instant no-confirm removes. Render it controlled:
 *
 *   const [confirm, setConfirm] = useState<null | (() => void)>(null);
 *   <Button onClick={() => setConfirm(() => () => remove.mutate({ id }))}>Remove</Button>
 *   <ConfirmModal open={!!confirm} ... onConfirm={() => { confirm?.(); setConfirm(null); }} />
 *
 * Migrated to Material UI (Dialog). API unchanged so all call sites are untouched.
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
