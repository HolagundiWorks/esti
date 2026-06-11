import { TRPCError } from "@trpc/server";

function retained(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

export function requireUnissuedDocument(
  record: { pdfStatus: string; pdfKey: string | null },
  label: string,
): void {
  if (record.pdfKey || !["NONE", "FAILED"].includes(record.pdfStatus)) {
    retained(`${label} has been issued or rendered and must be retained`);
  }
}

export function requireDeletableStatus(
  status: string,
  allowed: readonly string[],
  label: string,
): void {
  if (!allowed.includes(status)) retained(`${label} in ${status} status must be retained`);
}
