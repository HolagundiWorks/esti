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
): Promise<OrgHandle | { error: "domain_mismatch" | "domain_unverified" }> {
  const loginDomain = input.loginDomain?.trim().toLowerCase().replace(/^@/, "") || null;

  // A login-domain is a tenant-trust claim: anyone whose email is at that domain
  // auto-joins (see joinCompany). Only let the creator claim a domain they can
  // actually prove — their own *verified* email's domain — so a company can't be
  // used to squat another firm's domain and hijack its employees' joins.
  if (loginDomain) {
    const [acct] = await db
      .select({ email: schema.accounts.email, verifiedAt: schema.accounts.emailVerifiedAt })
      .from(schema.accounts)
      .where(eq(schema.accounts.id, accountId))
      .limit(1);
    if (!acct || domainOf(acct.email) !== loginDomain) return { error: "domain_mismatch" };
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

/** Admin: invite an existing account into an org (INVITED). */
export async function inviteMember(
  orgId: string,
  email: string,
  role = "MEMBER",
): Promise<{ ok: true } | { error: "account_not_found" }> {
  const normalized = email.trim().toLowerCase();
  const [acct] = await db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.email, normalized))
    .limit(1);
  if (!acct) return { error: "account_not_found" };
  const [existing] = await db
    .select({ id: schema.orgMembers.id })
    .from(schema.orgMembers)
    .where(and(eq(schema.orgMembers.orgId, orgId), eq(schema.orgMembers.accountId, acct.id)))
    .limit(1);
  if (existing) {
    await db
      .update(schema.orgMembers)
      .set({ status: "INVITED", role })
      .where(eq(schema.orgMembers.id, existing.id));
  } else {
    await db
      .insert(schema.orgMembers)
      .values({ id: newId("mem"), orgId, accountId: acct.id, role, status: "INVITED" });
  }
  return { ok: true };
}
