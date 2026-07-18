import { z } from "zod";

/** Knowledge Bank portal — EmOI intake → validated firm library → ESTI RAG. */
export const RepoSourceStatus = z.enum([
  "DRAFT",
  "PROCESSING",
  "REVIEW",
  "PUBLISHED",
  "FAILED",
]);
export type RepoSourceStatus = z.infer<typeof RepoSourceStatus>;

export const RepoSourceCategory = z.enum([
  "GENERAL",
  "DESIGN",
  "STRUCTURE",
  "MEP",
  "COMPLIANCE",
  "MANAGEMENT",
  "OTHER",
]);
export type RepoSourceCategory = z.infer<typeof RepoSourceCategory>;

export const RepoSourceCreate = z.object({
  title: z.string().min(1).max(300),
  author: z.string().max(200).optional(),
  category: RepoSourceCategory.default("GENERAL"),
  rawText: z.string().min(200).max(500_000),
});
export type RepoSourceCreate = z.infer<typeof RepoSourceCreate>;

export const RepoSourceUpdate = RepoSourceCreate.partial().extend({
  id: z.string().uuid(),
});
export type RepoSourceUpdate = z.infer<typeof RepoSourceUpdate>;

export const REPO_TEXTBOOK_EXTENSIONS = [".pdf", ".txt", ".md"] as const;
export const REPO_TEXTBOOK_MAX_BYTES = 50 * 1024 * 1024;

export const REPO_SOURCE_STATUS_LABEL: Record<RepoSourceStatus, string> = {
  DRAFT: "Draft",
  PROCESSING: "EmOI processing",
  REVIEW: "Ready for review",
  PUBLISHED: "Published to ESTI",
  FAILED: "Processing failed",
};

/** PDF → Markdown conversion (HCW Markdown Tool / worker). */
export const RepoConvertStatus = z.enum(["PROCESSING", "READY", "FAILED"]);
export type RepoConvertStatus = z.infer<typeof RepoConvertStatus>;

export const REPO_CONVERT_STATUS_LABEL: Record<RepoConvertStatus, string> = {
  PROCESSING: "Converting to Markdown",
  READY: "Markdown ready",
  FAILED: "Conversion failed",
};

/** Desktop PDF→Markdown tool by HCW — same pymupdf4llm pipeline as the worker job. */
export const HCW_MARKDOWN_TOOL = {
  name: "HCW Markdown Tool",
  repoUrl: "https://github.com/HolagundiWorks/hcw-markdown-tool",
  summary: "PDF to Markdown/CSV desktop app (pymupdf4llm) — offline alternative for large textbooks.",
} as const;

/** Normalize plain pasted text into markdown paragraphs for EmOI ingest. */
export function normalizePlainToMarkdown(text: string): string {
  const t = text.trim();
  if (!t) return t;
  if (/^#{1,6}\s/m.test(t) || /^\s*[-*+]\s/m.test(t) || /^\|.+\|/m.test(t) || /^```/m.test(t)) {
    return t;
  }
  return t
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");
}

/** Canonical ingest body for EmOI — prefers converted markdown. */
export function repoIngestMarkdown(source: {
  markdownText?: string | null;
  rawText?: string | null;
}): string {
  const md = source.markdownText?.trim();
  if (md) return md;
  const raw = source.rawText?.trim();
  if (!raw) return "";
  return normalizePlainToMarkdown(raw);
}
