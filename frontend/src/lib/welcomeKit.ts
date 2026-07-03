/**
 * Welcome kit — printable certificate (A4) and ID card (CC size) for a
 * generated AORMS-U identity. The pages are static print documents under
 * /welcome-kit; holder details travel as query params (public data only).
 * Card tiers: "id" (base, with the Unique Identification No) · "essential"
 * (issued after 100 hours on AORMS) · "pro" (issued against certification).
 */
export type CardTier = "id" | "essential" | "pro";

export function welcomeKitUrl(
  kind: "certificate" | "card",
  holder: { name?: string | null; id: string },
  tier: CardTier = "id",
): string {
  const params = new URLSearchParams();
  if (holder.name) params.set("name", holder.name);
  params.set("id", holder.id);
  params.set("date", new Date().toISOString().slice(0, 10));
  if (kind === "card" && tier !== "id") params.set("tier", tier);
  return `/welcome-kit/${kind}.html?${params.toString()}`;
}
