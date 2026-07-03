/**
 * Welcome kit — printable certificate (A4) and privilege card (CC size) for a
 * generated AORMS-U identity. The pages are static print documents under
 * /welcome-kit; holder details travel as query params (public data only).
 */
export function welcomeKitUrl(
  kind: "certificate" | "card",
  holder: { name?: string | null; id: string },
): string {
  const params = new URLSearchParams();
  if (holder.name) params.set("name", holder.name);
  params.set("id", holder.id);
  params.set("date", new Date().toISOString().slice(0, 10));
  return `/welcome-kit/${kind}.html?${params.toString()}`;
}
