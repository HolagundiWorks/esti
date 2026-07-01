import { and, eq } from "drizzle-orm";
import { db, schema } from "../../db/client.js";
import { env } from "../../env.js";

/** A company as surfaced to the login UI + session — never leaks internal ids. */
export interface OrgHandle {
  /** AORMS-C-XXXX (may be null for legacy rows not yet backfilled). */
  publicId: string | null;
  name: string;
  slug: string;
}

export type CompanyResolution =
  | { mode: "admin" }
  | { mode: "company"; org: OrgHandle }
  | { mode: "not_found" };

type OrgRow = typeof schema.organizations.$inferSelect;

function handle(o: OrgRow): OrgHandle {
  return { publicId: o.publicId, name: o.name, slug: o.slug };
}

/** The domain part of an email, else the input itself (already trimmed/lowercased). */
function domainOf(s: string): string {
  const at = s.lastIndexOf("@");
  return at >= 0 ? s.slice(at + 1) : s;
}

/**
 * Step-1 of tenant-first login: turn what a person typed (a company email, a
 * login domain, or an `AORMS-C-` handle) into the tenant to authenticate within.
 * Resolves the AORMS-owner branch (platform-admin) first, then a customer company
 * by handle → login domain → slug.
 */
export async function resolveCompany(inputRaw: string): Promise<CompanyResolution> {
  const s = inputRaw.trim().toLowerCase();
  if (!s) return { mode: "not_found" };

  const isEmail = s.includes("@");
  const domain = domainOf(s);

  // AORMS owner → the platform-admin login (by admin domain or a known admin email).
  if (env.PLATFORM_ADMIN_DOMAINS.includes(domain)) return { mode: "admin" };
  if (isEmail && env.PLATFORM_ADMIN_EMAILS.includes(s)) return { mode: "admin" };

  // Customer company: AORMS-C- handle, then login domain, then slug.
  const asHandle = inputRaw.trim().toUpperCase();
  if (asHandle.startsWith("AORMS-C-")) {
    const [byPub] = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.publicId, asHandle))
      .limit(1);
    if (byPub) return { mode: "company", org: handle(byPub) };
  }

  const [byDomain] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.loginDomain, domain))
    .limit(1);
  if (byDomain) return { mode: "company", org: handle(byDomain) };

  if (!isEmail) {
    const [bySlug] = await db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, s))
      .limit(1);
    if (bySlug) return { mode: "company", org: handle(bySlug) };
  }

  return { mode: "not_found" };
}

/** Resolve a company handle to its internal org id (or null). */
export async function orgIdFromHandle(inputRaw: string): Promise<string | null> {
  const asHandle = inputRaw.trim().toUpperCase();
  const s = inputRaw.trim().toLowerCase();
  const domain = domainOf(s);
  const [row] = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(
      asHandle.startsWith("AORMS-C-")
        ? eq(schema.organizations.publicId, asHandle)
        : eq(schema.organizations.loginDomain, domain),
    )
    .limit(1);
  if (row) return row.id;
  if (!s.includes("@")) {
    const [bySlug] = await db
      .select({ id: schema.organizations.id })
      .from(schema.organizations)
      .where(eq(schema.organizations.slug, s))
      .limit(1);
    return bySlug?.id ?? null;
  }
  return null;
}

/** The account's membership of an org (with role), or null if not a member. */
export async function membership(
  accountId: string,
  orgId: string,
): Promise<{ role: string } | null> {
  const [row] = await db
    .select({ role: schema.orgMembers.role })
    .from(schema.orgMembers)
    .where(and(eq(schema.orgMembers.accountId, accountId), eq(schema.orgMembers.orgId, orgId)))
    .limit(1);
  return row ?? null;
}

/** Every company the account is a member of, for the switcher + `me`. */
export async function membershipsFor(
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
    .where(eq(schema.orgMembers.accountId, accountId));
  return rows.map((r) => ({
    role: r.role,
    org: { publicId: r.publicId, name: r.name, slug: r.slug },
  }));
}

/** Resolve an org id to its handle (for `me.activeOrg`). */
export async function orgHandleById(orgId: string): Promise<OrgHandle | null> {
  const [row] = await db
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.id, orgId))
    .limit(1);
  return row ? handle(row) : null;
}
