/// <reference types="vite/client" />
import { Box, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

// Vite resolves the worker as a static asset URL.
GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type Props = {
  /** Raw PDF bytes as base64 (from drawings.pdf). */
  base64: string;
  /** 0-based page index. */
  pageNo?: number;
  /** Called when the page viewport size (PDF user units) is known. */
  onPageSize?: (size: { width: number; height: number }) => void;
};

/**
 * Renders page 0 of a plan PDF into a canvas for Measurement Plan markup.
 * Overlay SVG should use viewBox `0 0 width height` in the same PDF user units.
 */
export function PlanPdfCanvas({ base64, pageNo = 0, onPageSize }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onPageSizeRef = useRef(onPageSize);
  onPageSizeRef.current = onPageSize;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: ReturnType<typeof getDocument> | null = null;

    async function render() {
      setLoading(true);
      setError(null);
      try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        loadingTask = getDocument({ data: bytes });
        const doc = await loadingTask.promise;
        if (cancelled) return;
        const page = await doc.getPage(pageNo + 1);
        if (cancelled) return;

        // Render at 1.5× for crispness; overlay uses unscaled PDF user units.
        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        const unscaled = page.getViewport({ scale: 1 });
        onPageSizeRef.current?.({ width: unscaled.width, height: unscaled.height });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, canvas, viewport }).promise;
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to render PDF");
          setLoading(false);
        }
      }
    }

    void render();
    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [base64, pageNo]);

  return (
    <Box sx={{ width: "100%", position: "relative" }}>
      {loading && (
        <Typography variant="body2" sx={{ p: 2 }}>
          Rendering PDF plan…
        </Typography>
      )}
      {error && (
        <Typography variant="body2" color="error" sx={{ p: 2 }}>
          {error}
        </Typography>
      )}
      <Box
        component="canvas"
        ref={canvasRef}
        sx={{
          display: loading || error ? "none" : "block",
          width: "100%",
          height: "auto",
          maxHeight: "70vh",
        }}
      />
    </Box>
  );
}
