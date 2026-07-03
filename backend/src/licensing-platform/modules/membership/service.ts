import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "../../db/client.js";
import { newId, newPublicId } from "../../lib/ids.js";
import { type OrgHandle, orgIdFromHandle } from "../auth/tenant.js";

export type MemberStatus = "INVITED" | "ACTIVE" | "LEFT";

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "org"
  );
}

function orgHandle(o: typeof schema.organizations.$inferSelect): OrgHandle {
  return { publicId: o.publicId, name: o.name, slug: o.slug };
}

function domainOf(email: string): string {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : "";
}

/** Create a company owned by this account (OWNER, ACTIVE). Returns the new org. */
export async function createCompany(
  accountId: string,
  input: { name: string; loginDomain?: string | null },
): Promise<OrgHandle | { error: "domain_mismatch" | "domain_unverified" | "id_required" }> {
  const loginDomain = input.loginDomain?.trim().toLowerCase().replace(/^@/, "") || null;

  const [acct] = await db
    .select({
      email: schema.accounts.email,
      verifiedAt: schema.accounts.emailVerifiedAt,
      publicId: schema.accounts.publicId,
    })
    .from(schema.accounts)
    .where(eq(schema.accounts.id, accountId))
    .limit(1);

  // Companies are anchored to a person's permanent AORMS-U handle (Phase 34):
  // generate your ID first (earned at 100 hours, or instantly once invited to
  // a company), then found companies against it.
  if (!acct?.publicId) return { error: "id_required" };

  // A login-domain is a tenant-trust claim: anyone whose email is at that domain
  // auto-joins (see joinCompany). Only let the creator claim a domain they can
  // actually prove — their own *verified* email's domain — so a company can't be
  // used to squat another firm's domain and hijack its employees' joins.
  if (loginDomain) {
    if (domainOf(acct.email) !== loginDomain) return { error: "domain_mismatch" };
    if (!acct.verifiedAt) return { error: "domain_unverified" };
  }

  let slug = slugify(input.name);
  const [clash] = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, slug))
    .limit(1);
  if (clash) slug = `${slug}-${newId("s").slice(2, 6)}`;

  const orgId = newId("org");
  const [org] = await db
    .insert(schema.organizations)
    .values({
      id: orgId,
      publicId: newPublicId("C"),
      name: input.name,
      slug,
      loginDomain,
      ownerAccountId: accountId,
    })
    .returning();
  await db.insert(schema.orgMembers).values({
    id: newId("mem"),
    orgId,
    accountId,
    role: "OWNER",
    status: "ACTIVE",
    activatedAt: new Date(),
  });
  return orgHandle(org!);
}

/**
 * Activate a person into a company they named. Auto-ACTIVE when the account's
 * email domain matches the company's login domain (proven tenant membership);
 * otherwise INVITED, pending an admin/owner approval. Idempotent — an existing
 * membership is returned unchanged.
 */
export async function joinCompany(
  accountId: string,
  accountEmail: string,
  companyHandle: string,
): Promise<{ status: MemberStatus; org: OrgHandle } | { error: "company_not_found" }> {
  const orgId = await orgIdFromHandle(companyHandle);
  if (!orgId) return { error: "company_not_found" };
  const [org] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, orgId))
    .limit(1);
  if (!org) return { error: "company_not_found" };

  const [existing] = await db
    .select({ status: schema.orgMembers.status })
    .from(schema.orgMembers)
    .where(and(eq(schema.orgMembers.orgId, orgId), eq(schema.orgMembers.accountId, accountId)))
    .limit(1);
  if (existing && existing.status !== "LEFT") {
    return { status: existing.status as MemberStatus, org: orgHandle(org) };
  }

  // Auto-ACTIVE only when the domain matches AND the person has *verified* they
  // control that email — otherwise anyone could register `x@firm.com` (no proof)
  // and silently join firm.com's tenant. Unverified/mismatched joins land as
  // INVITED, pending an owner/admin approval.
  const [acct] = await db
    .select({ verifiedAt: schema.accounts.emailVerifiedAt })
    .from(schema.accounts)
    .where(eq(schema.accounts.id, accountId))
    .limit(1);
  const domainMatch = !!org.loginDomain && org.loginDomain === domainOf(accountEmail);
  const autoActive = domainMatch && Boolean(acct?.verifiedAt);
  const status: MemberStatus = autoActive ? "ACTIVE" : "INVITED";
  const values = {
    role: "MEMBER",
    status,
    activatedAt: autoActive ? new Date() : null,
    leftAt: null,
  };
  if (existing) {
    await db
      .update(schema.orgMembers)
      .set(values)
      .where(and(eq(schema.orgMembers.orgId, orgId), eq(schema.orgMembers.accountId, accountId)));
  } else {
    await db.insert(schema.orgMembers).values({ id: newId("mem"), orgId, accountId, ...values });
  }
  return { status, org: orgHandle(org) };
}

/** The account leaves a company — membership marked LEFT (certs/growth stay on the person). */
export async function leaveCompany(accountId: string, orgId: string): Promise<void> {
  await db
    .update(schema.orgMembers)
    .set({ status: "LEFT", leftAt: new Date() })
    .where(and(eq(schema.orgMembers.orgId, orgId), eq(schema.orgMembers.accountId, accountId)));
}

export interface MemberRow {
  accountId: string;
  publicId: string | null;
  email: string;
  name: string | null;
  role: string;
  status: string;
}

/** Admin: every membership of an org with the person's identity. */
export async function listMembers(orgId: string): Promise<MemberRow[]> {
  return db
    .select({
      accountId: schema.accounts.id,
      publicId: schema.accounts.publicId,
      email: schema.accounts.email,
      name: schema.accounts.name,
      role: schema.orgMembers.role,
      status: schema.orgMembers.status,
    })
    .from(schema.orgMembers)
    .innerJoin(schema.accounts, eq(schema.accounts.id, schema.orgMembers.accountId))
    .where(eq(schema.orgMembers.orgId, orgId))
    .orderBy(desc(schema.orgMembers.createdAt));
}

/** Admin/owner: set a member's activation status (approve an invite, or remove). */
export async function setMemberStatus(
  orgId: string,
  accountId: string,
  status: MemberStatus,
): Promise<void> {
  await db
    .update(schema.orgMembers)
    .set({
      status,
      activatedAt: status === "ACTIVE" ? new Date() : undefined,
      leftAt: status === "LEFT" ? new Date() : undefined,
    })
    .where(and(eq(schema.orgMembers.orgId, orgId), eq(schema.orgMembers.accountId, accountId)));
}

/**
 * Invite a person into an org by email (INVITED). When no account exists yet, a
 * passwordless account SHELL is created — it cannot log in; signing up with
 * that email later claims the shell (registerWithPassword). Inviting someone
 * who is already an ACTIVE member is a no-op; a LEFT member is re-invited.
 */
export async function inviteMember(
  orgId: string,
  email: string,
  role = "MEMBER",
): Promise<{ ok: true }> {
  const normalized = email.trim().toLowerCase();
  let [acct] = await db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.email, normalized))
    .limit(1);
  if (!acct) {
    [acct] = await db
      .insert(schema.accounts)
      .values({ id: newId("acc"), email: normalized })
      .returning({ id: schema.accounts.id });
  }
  const [existing] = await db
    .select({ id: schema.orgMembers.id, status: schema.orgMembers.status })
    .from(schema.orgMembers)
    .where(and(eq(schema.orgMembers.orgId, orgId), eq(schema.orgMembers.accountId, acct!.id)))
    .limit(1);
  if (existing?.status === "ACTIVE") return { ok: true };
  if (existing) {
    await db
      .update(schema.orgMembers)
      .set({ status: "INVITED", role, leftAt: null })
      .where(eq(schema.orgMembers.id, existing.id));
  } else {
    await db
      .insert(schema.orgMembers)
      .values({ id: newId("mem"), orgId, accountId: acct!.id, role, status: "INVITED" });
  }
  return { ok: true };
}

/** Is this account an OWNER-role ACTIVE member (or the founding owner) of the org? */
export async function isOrgAdmin(accountId: string, orgId: string): Promise<boolean> {
  const [org] = await db
    .select({ ownerAccountId: schema.organizations.ownerAccountId })
    .from(schema.organizations)
    .where(eq(schema.organizations.id, orgId))
    .limit(1);
  if (org?.ownerAccountId === accountId) return true;
  const [m] = await db
    .select({ role: schema.orgMembers.role })
    .from(schema.orgMembers)
    .where(
      and(
        eq(schema.orgMembers.orgId, orgId),
        eq(schema.orgMembers.accountId, accountId),
        eq(schema.orgMembers.status, "ACTIVE"),
      ),
    )
    .limit(1);
  return m?.role === "OWNER";
}

/** Companies this account has a pending invitation to. */
export async function pendingInvitesFor(
  accountId: string,
): Promise<Array<{ org: OrgHandle; role: string }>> {
  const rows = await db
    .select({
      role: schema.orgMembers.role,
      publicId: schema.organizations.publicId,
      name: schema.organizations.name,
      slug: schema.organizations.slug,
    })
    .from(schema.orgMembers)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.orgMembers.orgId))
    .where(and(eq(schema.orgMembers.accountId, accountId), eq(schema.orgMembers.status, "INVITED")));
  return rows.map((r) => ({
    role: r.role,
    org: { publicId: r.publicId, name: r.name, slug: r.slug },
  }));
}

/** The invited person accepts (INVITED → ACTIVE) their own pending invitation. */
export async function acceptInvite(
  accountId: string,
  companyHandle: string,
): Promise<{ ok: true; org: OrgHandle } | { error: "not_invited" | "company_not_found" }> {
  const orgId = await orgIdFromHandle(companyHandle);
  if (!orgId) return { error: "company_not_found" };
  const [m] = await db
    .select({ id: schema.orgMembers.id, status: schema.orgMembers.status })
    .from(schema.orgMembers)
    .where(and(eq(schema.orgMembers.orgId, orgId), eq(schema.orgMembers.accountId, accountId)))
    .limit(1);
  if (!m || m.status !== "INVITED") return { error: "not_invited" };
  await db
    .update(schema.orgMembers)
    .set({ status: "ACTIVE", activatedAt: new Date() })
    .where(eq(schema.orgMembers.id, m.id));
  const [org] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, orgId))
    .limit(1);
  return { ok: true, org: orgHandle(org!) };
}

/** The invited person declines — the pending membership is marked LEFT. */
export async function declineInvite(accountId: string, companyHandle: string): Promise<void> {
  const orgId = await orgIdFromHandle(companyHandle);
  if (!orgId) return;
  await db
    .update(schema.orgMembers)
    .set({ status: "LEFT", leftAt: new Date() })
    .where(
      and(
        eq(schema.orgMembers.orgId, orgId),
        eq(schema.orgMembers.accountId, accountId),
        eq(schema.orgMembers.status, "INVITED"),
      ),
    );
}

/**
 * Instant-ID eligibility (Phase 34): being invited into someone else's company
 * is professional vouching — it waives the 100-hour usage requirement for
 * generating the AORMS-U handle. True when the account holds any INVITED or
 * ACTIVE membership of an org it does not itself own.
 */
export async function invitedEligible(accountId: string): Promise<boolean> {
  const rows = await db
    .select({ status: schema.orgMembers.status, owner: schema.organizations.ownerAccountId })
    .from(schema.orgMembers)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.orgMembers.orgId))
    .where(eq(schema.orgMembers.accountId, accountId));
  return rows.some((r) => (r.status === "INVITED" || r.status === "ACTIVE") && r.owner !== accountId);
}

/**
 * Companies this email's account may enter (ACTIVE memberships) — powers the
 * workspace login's tenant-select step on unified single-box installs.
 */
export async function activeCompaniesByEmail(
  emailRaw: string,
): Promise<Array<{ publicId: string | null; name: string; role: string }>> {
  const email = emailRaw.trim().toLowerCase();
  const rows = await db
    .select({
      role: schema.orgMembers.role,
      publicId: schema.organizations.publicId,
      name: schema.organizations.name,
    })
    .from(schema.orgMembers)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.orgMembers.orgId))
    .innerJoin(schema.accounts, eq(schema.accounts.id, schema.orgMembers.accountId))
    .where(and(eq(schema.accounts.email, email), eq(schema.orgMembers.status, "ACTIVE")));
  return rows.map((r) => ({ publicId: r.publicId, name: r.name, role: r.role }));
}

/** Email-keyed variant for the (co-located) workspace usage.generateAormsId bypass. */
export async function invitedEligibleByEmail(emailRaw: string): Promise<boolean> {
  const email = emailRaw.trim().toLowerCase();
  const [acct] = await db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.email, email))
    .limit(1);
  if (!acct) return false;
  return invitedEligible(acct.id);
}

/**
 * "Use my existing AORMS ID" (Phase 34): a person invited at one email who
 * already holds an identity under another account moves the pending invitation
 * onto that existing account and activates it there. The caller (route) has
 * already verified the existing account's credentials; this just transfers the
 * membership row. The invited-email shell keeps any other data it has.
 */
export async function adoptInvite(
  invitedAccountId: string,
  existingAccountId: string,
  companyHandle: string,
): Promise<{ ok: true; org: OrgHandle } | { error: "not_invited" | "company_not_found" }> {
  const orgId = await orgIdFromHandle(companyHandle);
  if (!orgId) return { error: "company_not_found" };
  const [invited] = await db
    .select({ id: schema.orgMembers.id, role: schema.orgMembers.role, status: schema.orgMembers.status })
    .from(schema.orgMembers)
    .where(and(eq(schema.orgMembers.orgId, orgId), eq(schema.orgMembers.accountId, invitedAccountId)))
    .limit(1);
  if (!invited || invited.status !== "INVITED") return { error: "not_invited" };

  const [already] = await db
    .select({ id: schema.orgMembers.id })
    .from(schema.orgMembers)
    .where(and(eq(schema.orgMembers.orgId, orgId), eq(schema.orgMembers.accountId, existingAccountId)))
    .limit(1);
  if (already) {
    // The existing account already has a row in this org — activate it and
    // retire the invited shell's row.
    await db
      .update(schema.orgMembers)
      .set({ status: "ACTIVE", role: invited.role, activatedAt: new Date(), leftAt: null })
      .where(eq(schema.orgMembers.id, already.id));
    await db.delete(schema.orgMembers).where(eq(schema.orgMembers.id, invited.id));
  } else {
    await db
      .update(schema.orgMembers)
      .set({ accountId: existingAccountId, status: "ACTIVE", activatedAt: new Date() })
      .where(eq(schema.orgMembers.id, invited.id));
  }
  const [org] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, orgId))
    .limit(1);
  return { ok: true, org: orgHandle(org!) };
}
