export interface Account {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isPlatformAdmin: boolean;
}

export const googleStartUrl = "/platform/auth/google/start";

export async function fetchMe(): Promise<Account | null> {
  const r = await fetch("/platform/auth/me", { credentials: "include" });
  if (!r.ok) return null;
  const j = (await r.json()) as { account: Account | null };
  return j.account ?? null;
}

export async function devLogin(email: string): Promise<Account | null> {
  const r = await fetch("/platform/auth/dev-login", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { account: Account | null };
  return j.account ?? null;
}

export async function logout(): Promise<void> {
  await fetch("/platform/auth/logout", { method: "POST", credentials: "include" });
}
