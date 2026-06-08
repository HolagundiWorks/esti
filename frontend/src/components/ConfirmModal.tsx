import { Modal } from "@carbon/react";

/**
 * One confirmation pattern for destructive actions — replaces ad-hoc
 * `window.confirm` and instant no-confirm removes. Render it controlled:
 *
 *   const [confirm, setConfirm] = useState<null | (() => void)>(null);
 *   <Button onClick={() => setConfirm(() => () => remove.mutate({ id }))}>Remove</Button>
 *   <ConfirmModal open={!!confirm} ... onConfirm={() => { confirm?.(); setConfirm(null); }} />
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
  body: React.ReactNode;
  confirmText?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      danger={danger}
      modalHeading={heading}
      primaryButtonText={pending ? "Working…" : confirmText}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={pending}
      onRequestClose={onClose}
      onRequestSubmit={onConfirm}
    >
      {typeof body === "string" ? <p>{body}</p> : body}
    </Modal>
  );
}
