import { Button } from "@carbon/react";
import { pdfUiState } from "../lib/pdfUi.js";

type PdfActionButtonsProps = {
  status: string;
  url: string | null;
  canManage?: boolean;
  showRegenerateWhenReady?: boolean;
  generatePending?: boolean;
  onGenerate: () => void;
  labels?: {
    open?: string;
    generate?: string;
    retry?: string;
    generating?: string;
  };
};

/** Shared PDF generate / poll / open UI for document action cells. */
export function PdfActionButtons({
  status,
  url,
  canManage = true,
  showRegenerateWhenReady = false,
  generatePending = false,
  onGenerate,
  labels = {},
}: PdfActionButtonsProps) {
  const ui = pdfUiState(status, url);
  const openLabel = labels.open ?? "Open PDF";
  const generateLabel = labels.generate ?? "Generate PDF";
  const retryLabel = labels.retry ?? "Retry PDF";
  const generatingLabel = labels.generating ?? "Generating…";

  if (ui === "open" && url) {
    return (
      <span style={{ display: "inline-flex", gap: 4 }}>
        <Button kind="ghost" size="sm" href={url} target="_blank" rel="noreferrer">
          {openLabel}
        </Button>
        {showRegenerateWhenReady && canManage && (
          <Button kind="ghost" size="sm" disabled={generatePending} onClick={onGenerate}>
            Regenerate
          </Button>
        )}
      </span>
    );
  }
  if (ui === "generating") {
    return <span className="esti-label">{generatingLabel}</span>;
  }
  if (!canManage) {
    return <span>—</span>;
  }
  return (
    <Button kind="ghost" size="sm" disabled={generatePending} onClick={onGenerate}>
      {ui === "retry" ? retryLabel : generateLabel}
    </Button>
  );
}
