export interface Account {
  id: string;
  /** Portable personal handle — AORMS-U-XXXX. */
  publicId: string | null;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isPlatformAdmin: boolean;
}

export interface AuthResult {
  account: Account | null;
  /** Set when the flow began from a product "Create account" — navigate here. */
  redirect: string | null;
  error: string | null;
}

type AuthBody = { ok?: boolean; account?: Account | null; redirect?: string | null; error?: string };

async function postAuth(path: string, body: unknown): Promise<AuthResult> {
  const r = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = (await r.json().catch(() => ({}))) as AuthBody;
  if (!r.ok) return { account: null, redirect: null, error: j.error ?? "request_failed" };
  return { account: j.account ?? null, redirect: j.redirect ?? null, error: null };
}

export async function fetchMe(): Promise<Account | null> {
  const r = await fetch("/platform/auth/me", { credentials: "include" });
  if (!r.ok) return null;
  const j = (await r.json()) as { account: Account | null };
  return j.account ?? null;
}

export function register(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResult> {
  return postAuth("/platform/auth/register", input);
}

export function login(email: string, password: string): Promise<AuthResult> {
  return postAuth("/platform/auth/login", { email, password });
}

export async function devLogin(email: string): Promise<Account | null> {
  const j = await postAuth("/platform/auth/dev-login", { email });
  return j.account;
}

export async function logout(): Promise<void> {
  await fetch("/platform/auth/logout", { method: "POST", credentials: "include" });
}
