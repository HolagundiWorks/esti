export interface Account {
  id: string;
  /** Portable personal handle — AORMS-U-XXXX. */
  publicId: string | null;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isPlatformAdmin: boolean;
}

/** A company (tenant) handle as surfaced to the login UI + switcher. */
export interface OrgHandle {
  publicId: string | null;
  name: string;
  slug: string;
}

export interface Membership {
  org: OrgHandle;
  role: string;
}

/** The `me` view: person + active company + every company they can enter. */
export interface Me {
  account: Account | null;
  activeOrg: OrgHandle | null;
  memberships: Membership[];
}

/** Step-1 resolution of a typed company handle. */
export type CompanyResolution =
  | { mode: "admin" }
  | { mode: "company"; org: OrgHandle }
  | { mode: "not_found" };

export interface AuthResult {
  account: Account | null;
  /** Set when the flow began from a product "Create account" — navigate here. */
  redirect: string | null;
  activeOrg: OrgHandle | null;
  error: string | null;
}

type AuthBody = {
  ok?: boolean;
  account?: Account | null;
  redirect?: string | null;
  activeOrg?: OrgHandle | null;
  error?: string;
};

async function postAuth(path: string, body: unknown): Promise<AuthResult> {
  const r = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = (await r.json().catch(() => ({}))) as AuthBody;
  if (!r.ok)
    return { account: null, redirect: null, activeOrg: null, error: j.error ?? "request_failed" };
  return {
    account: j.account ?? null,
    redirect: j.redirect ?? null,
    activeOrg: j.activeOrg ?? null,
    error: null,
  };
}

const EMPTY_ME: Me = { account: null, activeOrg: null, memberships: [] };

export async function fetchMe(): Promise<Me> {
  const r = await fetch("/platform/auth/me", { credentials: "include" });
  if (!r.ok) return EMPTY_ME;
  const j = (await r.json()) as Partial<Me>;
  return { account: j.account ?? null, activeOrg: j.activeOrg ?? null, memberships: j.memberships ?? [] };
}

/** Step 1: resolve what the person typed into the tenant to sign in under. */
export async function resolveCompany(company: string): Promise<CompanyResolution> {
  const r = await fetch("/platform/auth/resolve-company", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ company }),
  });
  if (!r.ok) return { mode: "not_found" };
  return (await r.json()) as CompanyResolution;
}

async function postMe(path: string, body: unknown): Promise<Me & { status?: string; error?: string }> {
  const r = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = (await r.json().catch(() => ({}))) as Partial<Me> & { status?: string; error?: string };
  if (!r.ok) return { ...EMPTY_ME, error: j.error ?? "request_failed" };
  return {
    account: j.account ?? null,
    activeOrg: j.activeOrg ?? null,
    memberships: j.memberships ?? [],
    status: j.status,
  };
}

export function switchCompany(company: string): Promise<Me> {
  return postMe("/platform/auth/switch-company", { company });
}

export function createCompany(name: string, loginDomain?: string): Promise<Me & { error?: string }> {
  return postMe("/platform/auth/create-company", { name, loginDomain });
}

/** Join / request access to a company. `status` is ACTIVE (auto) or INVITED (pending). */
export function joinCompany(company: string): Promise<Me & { status?: string; error?: string }> {
  return postMe("/platform/auth/join-company", { company });
}

export function leaveCompany(company: string): Promise<Me & { error?: string }> {
  return postMe("/platform/auth/leave-company", { company });
}

export interface Certification {
  id: string;
  title: string;
  issuer: string | null;
  issuedAt: string | null;
  evidenceKey: string | null;
  status: string;
}

export interface GrowthEvent {
  id: string;
  kind: string;
  value: Record<string, unknown>;
  orgPublicId: string | null;
  at: string;
}

export interface Credentials {
  certifications: Certification[];
  growth: GrowthEvent[];
}

export async function fetchCredentials(): Promise<Credentials> {
  const r = await fetch("/platform/auth/my-credentials", { credentials: "include" });
  if (!r.ok) return { certifications: [], growth: [] };
  const j = (await r.json()) as Partial<Credentials>;
  return { certifications: j.certifications ?? [], growth: j.growth ?? [] };
}

export function register(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthResult> {
  return postAuth("/platform/auth/register", input);
}

export function login(email: string, password: string, company?: string): Promise<AuthResult> {
  return postAuth("/platform/auth/login", { email, password, company });
}

export async function devLogin(email: string): Promise<Account | null> {
  const j = await postAuth("/platform/auth/dev-login", { email });
  return j.account;
}

export async function logout(): Promise<void> {
  await fetch("/platform/auth/logout", { method: "POST", credentials: "include" });
}
