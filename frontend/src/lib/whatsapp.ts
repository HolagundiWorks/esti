/**
 * Share a document via WhatsApp.
 *
 * On devices whose browser supports the Web Share API with files (mobile — the
 * common case for a LAN teammate on a phone), the ACTUAL PDF is attached to a
 * WhatsApp message. Elsewhere we fall back to opening WhatsApp with a prefilled
 * message (and a link to the file, if one was given). A phone number, when
 * provided, addresses the message to that contact.
 */
export async function shareViaWhatsApp(opts: {
  fileUrl?: string;
  fileName?: string;
  text: string;
  phone?: string;
}): Promise<void> {
  const { fileUrl, fileName, text, phone } = opts;

  if (fileUrl && typeof navigator !== "undefined" && typeof navigator.canShare === "function") {
    try {
      const res = await fetch(fileUrl);
      if (res.ok) {
        const blob = await res.blob();
        const file = new File([blob], fileName ?? "document.pdf", {
          type: blob.type || "application/pdf",
        });
        if (navigator.canShare({ files: [file] })) {
          // Native share sheet (offers WhatsApp with the file attached). Return
          // regardless of outcome so we don't also open the wa.me fallback.
          try {
            await navigator.share({ files: [file], text });
          } catch {
            /* user dismissed the share sheet */
          }
          return;
        }
      }
    } catch {
      /* fetch/share unavailable — fall through to the link */
    }
  }

  const digits = phone?.replace(/\D/g, "") ?? "";
  const body = fileUrl ? `${text}\n${fileUrl}` : text;
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  window.open(`${base}?text=${encodeURIComponent(body)}`, "_blank", "noopener,noreferrer");
}
