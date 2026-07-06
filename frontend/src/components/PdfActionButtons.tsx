import Share from "@mui/icons-material/Share";
import { Button, Stack } from "@mui/material";
import { pdfUiState } from "../lib/pdfUi.js";
import { shareViaWhatsApp } from "../lib/whatsapp.js";

type PdfActionButtonsProps = {
  status: string;
  url: string | null;
  canManage?: boolean;
  showRegenerateWhenReady?: boolean;
  generatePending?: boolean;
  onGenerate: () => void;
  /** When set, shows a "WhatsApp" action once the PDF is ready. */
  share?: { text?: string; phone?: string; fileName?: string };
  labels?: {
    open?: string;
    generate?: string;
    retry?: string;
    generating?: string;
  };
};

/** Shared PDF generate / poll / open UI for document action cells. Material UI. */
export function PdfActionButtons({
  status,
  url,
  canManage = true,
  showRegenerateWhenReady = false,
  generatePending = false,
  onGenerate,
  share,
  labels = {},
}: PdfActionButtonsProps) {
  const ui = pdfUiState(status, url);
  const openLabel = labels.open ?? "Open PDF";
  const generateLabel = labels.generate ?? "Generate PDF";
  const retryLabel = labels.retry ?? "Retry PDF";
  const generatingLabel = labels.generating ?? "Generating…";

  if (ui === "open" && url) {
    return (
      <Stack direction="row" spacing={0.5} sx={{ display: "inline-flex" }}>
        <Button variant="text" size="small" href={url} target="_blank" rel="noreferrer">
          {openLabel}
        </Button>
        {share && (
          <Button
            variant="text"
            size="small"
            startIcon={<Share />}
            onClick={() =>
              void shareViaWhatsApp({
                fileUrl: url,
                fileName: share.fileName,
                text: share.text ?? "Please find the attached document.",
                phone: share.phone,
              })
            }
          >
            WhatsApp
          </Button>
        )}
        {showRegenerateWhenReady && canManage && (
          <Button variant="text" size="small" disabled={generatePending} onClick={onGenerate}>
            Regenerate
          </Button>
        )}
      </Stack>
    );
  }
  if (ui === "generating") {
    return <span className="esti-label">{generatingLabel}</span>;
  }
  if (!canManage) {
    return <span>—</span>;
  }
  return (
    <Button variant="text" size="small" disabled={generatePending} onClick={onGenerate}>
      {ui === "retry" ? retryLabel : generateLabel}
    </Button>
  );
}
