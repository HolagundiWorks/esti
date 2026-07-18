/**
 * Lightweight content sniffing for uploads. Extension checks are trivially
 * spoofable, so we also inspect magic bytes / structure before trusting a file
 * (audit S3). These are defensive heuristics, not a full parser.
 */

const startsWith = (buf: Buffer, sig: number[], offset = 0): boolean =>
  buf.length >= offset + sig.length && sig.every((b, i) => buf[offset + i] === b);

const DXF_HEAD_BYTES = 8192;

/** PDF — `%PDF` magic at file start (plan sheets for measurement). */
export function looksLikePdf(buf: Buffer): boolean {
  if (buf.length < 5) return false;
  return buf.subarray(0, 5).toString("latin1") === "%PDF-";
}

/** AutoCAD DWG — common magic at file start (users often pick .dwg by mistake). */
export function looksLikeDwg(buf: Buffer): boolean {
  if (buf.length < 6) return false;
  const sig = buf.subarray(0, 6).toString("ascii");
  return sig.startsWith("AC10") || sig.startsWith("AC1.");
}

/** AutoCAD DXF — ASCII (group-code text) or the binary DXF sentinel. */
export function looksLikeDxf(buf: Buffer): boolean {
  if (buf.length < 8) return false;
  // Binary DXF: "AutoCAD Binary DXF\r\n\x1a\x00"
  const binarySentinel = "AutoCAD Binary DXF";
  const head = buf.subarray(0, Math.min(buf.length, DXF_HEAD_BYTES)).toString("latin1");
  if (head.startsWith(binarySentinel)) return true;
  // ASCII DXF: group code 0 + SECTION (case-insensitive). Tolerate BOM, leading
  // comments (999 groups), and preamble before the first SECTION block.
  let text = head;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (!/\bsection\b/i.test(text)) return false;
  return /(?:^|\r?\n)\s*0\s*(?:\r?\n|$)/m.test(text);
}

const IMAGE_SIGNATURES: Record<string, (buf: Buffer) => boolean> = {
  ".png": (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  ".jpg": (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  ".jpeg": (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  // RIFF....WEBP
  ".webp": (b) => startsWith(b, [0x52, 0x49, 0x46, 0x46]) && b.subarray(8, 12).toString("latin1") === "WEBP",
  ".svg": (b) => isSafeSvg(b),
};

/** An SVG must be XML-ish and free of obvious script/event-handler vectors. */
export function isSafeSvg(buf: Buffer): boolean {
  const text = buf.subarray(0, 65536).toString("utf8").toLowerCase();
  if (!text.includes("<svg")) return false;
  // Block the common SVG-borne XSS vectors (defence-in-depth; logos are static).
  if (/<script|javascript:|on\w+\s*=|<foreignobject/.test(text)) return false;
  return true;
}

/** Validate an image buffer against its claimed extension. */
export function imageMatchesExt(buf: Buffer, ext: string): boolean {
  const check = IMAGE_SIGNATURES[ext];
  return check ? check(buf) : false;
}

/** Heuristic: a text file (CSV) has no NUL bytes in its leading chunk. */
function looksTextual(buf: Buffer): boolean {
  const chunk = buf.subarray(0, 8192);
  return !chunk.includes(0x00);
}

/** Validate a tabular upload (CSV text, XLSX zip, legacy XLS OLE) by extension. */
export function tabularMatchesExt(buf: Buffer, ext: string): boolean {
  switch (ext) {
    case ".csv":
    case ".tsv":
    case ".txt":
      return looksTextual(buf);
    case ".xlsx":
      // XLSX is a ZIP container.
      return startsWith(buf, [0x50, 0x4b, 0x03, 0x04]);
    case ".xls":
      // Legacy XLS is an OLE2 compound file.
      return startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    default:
      return false;
  }
}
