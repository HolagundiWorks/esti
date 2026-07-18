import {
  ACCOUNT_STATUS_LABEL,
  type AccountSignupProfile,
  type AccountStatus,
} from "@esti/contracts";

export interface Account {
  id: string;
  /** Portable personal handle — AORMS-U-XXXX. */
  publicId: string | null;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isPlatformAdmin: boolean;
  status?: AccountStatus;
  profile?: AccountSignupProfile | null;
}

/** A company (tenant) handle as surfaced to the login UI + switcher. */
export interface OrgHandle {
  publicId: string | null;
  name: string;
  slug: string;
  /** Which AORMS workspace the company runs — STUDIO | CONSULTANCY. */
  workspaceType?: string;
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
  /** Companies awaiting this person's acceptance (Phase 34 invites). */
  pendingInvites: Membership[];
  /** May mint an AORMS-U handle instantly (invited into a company). */
  instantIdEligible: boolean;
  totpEnabled: boolean;
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

const EMPTY_ME: Me = { account: null, activeOrg: null, memberships: [], pendingInvites: [], instantIdEligible: false, totpEnabled: false };

export async function fetchMe(): Promise<Me> {
  const r = await fetch("/platform/auth/me", { credentials: "include" });
  if (!r.ok) return EMPTY_ME;
  const j = (await r.json()) as Partial<Me>;
  return {
    account: j.account ?? null,
    activeOrg: j.activeOrg ?? null,
    memberships: j.memberships ?? [],
    pendingInvites: j.pendingInvites ?? [],
    instantIdEligible: Boolean(j.instantIdEligible),
    totpEnabled: Boolean(j.totpEnabled),
  };
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
    pendingInvites: j.pendingInvites ?? [],
    instantIdEligible: Boolean(j.instantIdEligible),
    totpEnabled: Boolean(j.totpEnabled),
    status: j.status,
  };
}

export function switchCompany(company: string): Promise<Me> {
  return postMe("/platform/auth/switch-company", { company });
}

export function createCompany(
  name: string,
  loginDomain?: string,
  workspaceType?: "STUDIO" | "CONSULTANCY",
): Promise<Me & { error?: string }> {
  return postMe("/platform/auth/create-company", { name, loginDomain, workspaceType });
}

/** Join / request access to a company. `status` is ACTIVE (auto) or INVITED (pending). */
export function joinCompany(company: string): Promise<Me & { status?: string; error?: string }> {
  return postMe("/platform/auth/join-company", { company });
}

export function leaveCompany(company: string): Promise<Me & { error?: string }> {
  return postMe("/platform/auth/leave-company", { company });
}

/** Company owner invites a person by email (creates a claimable shell if new). */
export async function inviteToCompany(
  company: string,
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  const r = await fetch("/platform/auth/invite-member", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ company, email }),
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  return { ok: Boolean(j.ok), error: j.error };
}

export function acceptInvite(company: string): Promise<Me & { error?: string }> {
  return postMe("/platform/auth/accept-invite", { company });
}

export function declineInvite(company: string): Promise<Me & { error?: string }> {
  return postMe("/platform/auth/decline-invite", { company });
}

/** Company-identity progress (owner-only) — AORMS-C unlocks at 100 company hours. */
export interface CompanyIdStatus {
  publicId: string | null;
  minutes: number;
  requiredMinutes: number;
  eligible: boolean;
}

export async function fetchCompanyIdStatus(company: string): Promise<CompanyIdStatus | null> {
  const r = await fetch(`/platform/auth/company-id-status?company=${encodeURIComponent(company)}`, {
    credentials: "include",
  });
  if (!r.ok) return null;
  const j = (await r.json().catch(() => null)) as (CompanyIdStatus & { ok?: boolean }) | null;
  return j?.ok ? j : null;
}

/** Mint the company's permanent AORMS-C handle (owner-only, 100 company hours). */
export async function generateCompanyId(
  company: string,
): Promise<{ publicId: string | null; error?: string }> {
  const r = await fetch("/platform/auth/generate-company-id", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ company }),
  });
  const j = (await r.json().catch(() => ({}))) as { publicId?: string; error?: string };
  return { publicId: j.publicId ?? null, error: j.error };
}

/** Mint AORMS-U after 100 hours of active workspace use. */
export async function generateAormsId(): Promise<{ publicId: string | null; error?: string }> {
  const r = await fetch("/platform/auth/generate-id", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  const j = (await r.json().catch(() => ({}))) as { publicId?: string; error?: string };
  return { publicId: j.publicId ?? null, error: j.error };
}

export interface OrgMemberRow {
  accountId: string;
  publicId: string | null;
  email: string;
  name: string | null;
  role: string;
  status: string;
}

export async function fetchOrgMembers(
  company: string,
): Promise<{ members: OrgMemberRow[]; error?: string }> {
  const r = await fetch(`/platform/auth/org-members?company=${encodeURIComponent(company)}`, {
    credentials: "include",
  });
  const j = (await r.json().catch(() => ({}))) as { members?: OrgMemberRow[]; error?: string };
  if (!r.ok) return { members: [], error: j.error ?? "request_failed" };
  return { members: j.members ?? [] };
}

export async function reviewMember(
  company: string,
  accountId: string,
  action: "approve" | "reject",
): Promise<{ members: OrgMemberRow[]; error?: string }> {
  const r = await fetch("/platform/auth/review-member", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ company, accountId, action }),
  });
  const j = (await r.json().catch(() => ({}))) as { members?: OrgMemberRow[]; error?: string };
  if (!r.ok) return { members: [], error: j.error ?? "request_failed" };
  return { members: j.members ?? [] };
}

/** Move a pending invite onto the person's existing identity-holding account. */
export function adoptIdentity(
  company: string,
  email: string,
  password: string,
  code?: string,
): Promise<Me & { error?: string }> {
  return postMe("/platform/auth/adopt-identity", { company, email, password, code });
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

/** Whether admin-console self-signup is still open (closes after the first admin). */
export async function fetchRegistrationStatus(): Promise<{ adminExists: boolean }> {
  const r = await fetch("/platform/auth/registration-status", { credentials: "include" });
  if (!r.ok) return { adminExists: false };
  const j = (await r.json()) as { adminExists?: boolean };
  return { adminExists: Boolean(j.adminExists) };
}

export interface MyLicense {
  planCode: string;
  productCode: string;
  status: string;
  seats: number | null;
  deviceLimit: number | null;
  expiresAt: string | null;
}

export async function fetchMyLicense(): Promise<MyLicense | null> {
  const r = await fetch("/platform/auth/my-license", { credentials: "include" });
  if (!r.ok) return null;
  const j = (await r.json()) as { license?: MyLicense | null };
  return j.license ?? null;
}

export interface PlanRequest {
  id: string;
  email: string;
  planCode: string;
  status: string;
  note: string | null;
  licenseId: string | null;
  createdAt: string;
}

export async function fetchMyRequest(): Promise<PlanRequest | null> {
  const r = await fetch("/platform/auth/my-request", { credentials: "include" });
  if (!r.ok) return null;
  const j = (await r.json()) as { request: PlanRequest | null };
  return j.request ?? null;
}

export async function requestPlan(plan: string): Promise<{ ok: boolean; error?: string; request?: PlanRequest }> {
  const r = await fetch("/platform/auth/request-plan", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; request?: PlanRequest };
  return { ok: Boolean(j.ok), error: j.error, request: j.request };
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
  profile?: AccountSignupProfile;
  /** Customer user-portal sign-up (bypasses the admin-console signup lockdown). */
  portal?: boolean;
}): Promise<AuthResult> {
  return postAuth("/platform/auth/register", input);
}

export async function updateAccountProfile(
  profile: Partial<AccountSignupProfile>,
): Promise<{ account: Account | null; error?: string }> {
  const r = await fetch("/platform/auth/profile", {
    method: "PATCH",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(profile),
  });
  const j = (await r.json().catch(() => ({}))) as { account?: Account; error?: string };
  if (!r.ok) return { account: null, error: j.error ?? "request_failed" };
  return { account: j.account ?? null };
}

export { ACCOUNT_STATUS_LABEL };

export function login(
  email: string,
  password: string,
  company?: string,
  code?: string,
): Promise<AuthResult> {
  return postAuth("/platform/auth/login", { email, password, company, code });
}

/** Unified installs: reuse workspace OWNER session for the company account portal. */
export function sessionFromWorkspace(): Promise<Me & { error?: string }> {
  return postMe("/platform/auth/session-from-workspace", {});
}

export async function devLogin(email: string): Promise<Account | null> {
  const j = await postAuth("/platform/auth/dev-login", { email });
  return j.account;
}

export async function logout(): Promise<void> {
  await fetch("/platform/auth/logout", { method: "POST", credentials: "include" });
}

// --- Two-factor authenticator (TOTP) ---
async function postJson(path: string, body?: unknown): Promise<Record<string, unknown>> {
  const r = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return (await r.json().catch(() => ({}))) as Record<string, unknown>;
}

export async function totpSetup(): Promise<{ secret: string; otpauthUrl: string }> {
  const j = await postJson("/platform/auth/totp/setup");
  return { secret: String(j.secret ?? ""), otpauthUrl: String(j.otpauthUrl ?? "") };
}

export async function totpEnable(secret: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const j = await postJson("/platform/auth/totp/enable", { secret, code });
  return { ok: Boolean(j.ok), error: j.error as string | undefined };
}

export async function totpDisable(code: string): Promise<{ ok: boolean; error?: string }> {
  const j = await postJson("/platform/auth/totp/disable", { code });
  return { ok: Boolean(j.ok), error: j.error as string | undefined };
}
