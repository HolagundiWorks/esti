/** Trigger a browser download of a JSON object as a named file. */
export function downloadJson(filename: string, obj: unknown): void {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** ₹ formatting from integer paise (light — the app has no @esti/contracts money dep at UI level). */
export const inr = (paise: number): string =>
  "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });
