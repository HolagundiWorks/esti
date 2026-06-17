/** Redact common PII patterns before storing or displaying AI output. */
export function redactPii(text: string): string {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email redacted]")
    .replace(/\b(?:\+91[\s-]?)?[6-9]\d{9}\b/g, "[phone redacted]")
    .replace(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/g, "[PAN redacted]")
    .replace(/\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/g, "[GSTIN redacted]");
}
