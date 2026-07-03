import { and, eq, gt, isNull, or } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "../../../auth/session.js";
import { db as workspaceDb } from "../../../db/index.js";
import { users as workspaceUsers } from "../../../db/schema/index.js";
import { emailMatches } from "../../../lib/email.js";
import { verifyTotp } from "../../../lib/totp.js";
import { db, schema } from "../../db/client.js";
import { env } from "../../env.js";
import { hashApiKey } from "../../lib/apikey.js";
import { newId, newPublicId } from "../../lib/ids.js";
import { membership, orgIdFromHandle, resolveCompany } from "./tenant.js";

export interface AccountView {
  id: string;
  /** Portable personal handle — AORMS-U-XXXX. */
  publicId: string | null;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isPlatformAdmin: boolean;
}

type AccountRow = typeof schema.accounts.$inferSelect;

function view(a: AccountRow): AccountView {
  return {
    id: a.id,
    publicId: a.publicId,
    email: a.email,
    name: a.name,
    avatarUrl: a.avatarUrl,
    isPlatformAdmin: a.isPlatformAdmin,
  };
}

export async function getAccountById(id: string): Promise<AccountView | null> {
  const [a] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, id)).limit(1);
  return a ? view(a) : null;
}

/** True once at least one platform-admin account exists (first-admin bootstrap done). */
export async function hasPlatformAdmin(): Promise<boolean> {
  const [a] = await db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.isPlatformAdmin, true))
    .limit(1);
  return Boolean(a);
}

export interface UpsertInput {
  email: string;
  googleSub?: string;
  name?: string | null;
  avatarUrl?: string | null;
}

/** Find by Google subject (preferred) or email, else create. Grants platform
 *  admin when the email is in `PLATFORM_ADMIN_EMAILS` (never revokes it). */
export async function upsertAccount(input: UpsertInput): Promise<AccountView> {
  const email = input.email.toLowerCase();
  const grantAdmin = env.PLATFORM_ADMIN_EMAILS.includes(email);

  const [existing] = await db
    .select()
    .from(schema.accounts)
    .where(
      input.googleSub
        ? or(eq(schema.accounts.googleSub, input.googleSub), eq(schema.accounts.email, email))
        : eq(schema.accounts.email, email),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(schema.accounts)
      .set({
        googleSub: input.googleSub ?? existing.googleSub,
        name: input.name ?? existing.name,
        avatarUrl: input.avatarUrl ?? existing.avatarUrl,
        isPlatformAdmin: existing.isPlatformAdmin || grantAdmin,
        updatedAt: new Date(),
      })
      .where(eq(schema.accounts.id, existing.id))
      .returning();
    return view(updated!);
  }

  // Earned identity (Phase 34): accounts start WITHOUT an AORMS-U handle —
  // it is generated later, after 100 hours of product usage.
  const [created] = await db
    .insert(schema.accounts)
    .values({
      id: newId("acc"),
      email,
      googleSub: input.googleSub ?? null,
      name: input.name ?? null,
      avatarUrl: input.avatarUrl ?? null,
      isPlatformAdmin: grantAdmin,
    })
    .returning();
  return view(created!);
}

/** Register a new account with email + password. Throws "email_taken" if used. */
export async function registerWithPassword(input: {
  email: string;
  password: string;
  name?: string | null;
}): Promise<AccountView> {
  const email = input.email.toLowerCase();
  const [existing] = await db
    .select({
      id: schema.accounts.id,
      passwordHash: schema.accounts.passwordHash,
      googleSub: schema.accounts.googleSub,
      name: schema.accounts.name,
    })
    .from(schema.accounts)
    .where(eq(schema.accounts.email, email))
    .limit(1);

  const passwordHash = await hashPassword(input.password);
  const grantAdmin = env.PLATFORM_ADMIN_EMAILS.includes(email);

  // A passwordless, non-Google row is an account SHELL — created when someone
  // was invited into a company (inviteMember) or earned an AORMS ID from a
  // workspace before ever signing up. Registering with that email claims it,
  // keeping its memberships/identity. A row with credentials stays taken.
  if (existing) {
    if (existing.passwordHash || existing.googleSub) throw new Error("email_taken");
    const [claimed] = await db
      .update(schema.accounts)
      .set({
        passwordHash,
        name: input.name ?? existing.name,
        isPlatformAdmin: grantAdmin,
        updatedAt: new Date(),
      })
      .where(eq(schema.accounts.id, existing.id))
      .returning();
    return view(claimed!);
  }
  const [created] = await db
    .insert(schema.accounts)
    .values({
      id: newId("acc"),
      // Earned identity (Phase 34): no AORMS-U handle at signup — generated
      // after 100 hours of product usage (see mintPublicIdForEmail).
      email,
      name: input.name ?? null,
      passwordHash,
      isPlatformAdmin: grantAdmin,
    })
    .returning();
  return view(created!);
}

/**
 * Earned identity (Phase 34): mint the permanent AORMS-U handle for the account
 * with this email, creating a passwordless account shell first if none exists
 * (a workspace-only user earning their handle materialises on the platform —
 * a shell without a password hash cannot log in). Idempotent: an existing
 * handle is returned untouched, since the handle must never change.
 */
export type WorkspaceAdoption =
  | { kind: "ok"; account: AccountView }
  | { kind: "totp_required" }
  | { kind: "totp_invalid" }
  | { kind: "invalid" };

/**
 * Unified single-box fallback (Phase 34): the /account portal accepts a
 * WORKSPACE login (esti_user) that has no platform password yet — the seeded
 * owner, owner-created staff. On success the platform account is created (or
 * a passwordless shell claimed) mirroring the SAME password hash (both stores
 * share the hasher), so one set of credentials works at /login and /account.
 * A platform account that already has its own credentials is never touched.
 * The workspace user's authenticator, when enabled, is enforced here too.
 */
export async function loginWithWorkspaceCredentials(
  emailRaw: string,
  password: string,
  code?: string,
): Promise<WorkspaceAdoption> {
  const email = emailRaw.trim().toLowerCase();
  const [u] = await workspaceDb
    .select()
    .from(workspaceUsers)
    .where(emailMatches(workspaceUsers.email, email))
    .limit(1);
  if (!u || u.disabled || !u.passwordHash) return { kind: "invalid" };
  if (!(await verifyPassword(u.passwordHash, password))) return { kind: "invalid" };
  if (u.totpSecret) {
    const trimmed = code?.trim();
    if (!trimmed) return { kind: "totp_required" };
    if (!verifyTotp(u.totpSecret, trimmed)) return { kind: "totp_invalid" };
  }

  const grantAdmin = env.PLATFORM_ADMIN_EMAILS.includes(email);
  const [existing] = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.email, email))
    .limit(1);
  if (existing) {
    // A real platform account (own password / Google) keeps its own
    // credentials — the workspace password must not override them.
    if (existing.passwordHash || existing.googleSub) return { kind: "invalid" };
    const [claimed] = await db
      .update(schema.accounts)
      .set({
        passwordHash: u.passwordHash,
        name: existing.name ?? u.fullName,
        publicId: existing.publicId ?? u.accountPublicId ?? null,
        isPlatformAdmin: existing.isPlatformAdmin || grantAdmin,
        updatedAt: new Date(),
      })
      .where(eq(schema.accounts.id, existing.id))
      .returning();
    return { kind: "ok", account: view(claimed!) };
  }
  const [created] = await db
    .insert(schema.accounts)
    .values({
      id: newId("acc"),
      email,
      name: u.fullName,
      passwordHash: u.passwordHash,
      publicId: u.accountPublicId ?? null,
      isPlatformAdmin: grantAdmin,
    })
    .returning();
  return { kind: "ok", account: view(created!) };
}

/** Stamp the email as verified (idempotent) — used after a Google sign-in. */
export async function markEmailVerified(accountId: string): Promise<void> {
  await db
    .update(schema.accounts)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.accounts.id, accountId), isNull(schema.accounts.emailVerifiedAt)));
}

/** Idempotently mint the AORMS-U handle for a signed-in account (instant-ID path). */
export async function ensureAccountPublicId(accountId: string): Promise<string | null> {
  const [a] = await db
    .select({ publicId: schema.accounts.publicId })
    .from(schema.accounts)
    .where(eq(schema.accounts.id, accountId))
    .limit(1);
  if (!a) return null;
  if (a.publicId) return a.publicId;
  const publicId = newPublicId("U");
  await db
    .update(schema.accounts)
    .set({ publicId, updatedAt: new Date() })
    .where(eq(schema.accounts.id, accountId));
  return publicId;
}

export async function mintPublicIdForEmail(
  emailRaw: string,
  name?: string | null,
): Promise<string> {
  const email = emailRaw.trim().toLowerCase();
  const [existing] = await db
    .select({ id: schema.accounts.id, publicId: schema.accounts.publicId })
    .from(schema.accounts)
    .where(eq(schema.accounts.email, email))
    .limit(1);
  if (existing?.publicId) return existing.publicId;

  const publicId = newPublicId("U");
  if (existing) {
    await db
      .update(schema.accounts)
      .set({ publicId, updatedAt: new Date() })
      .where(eq(schema.accounts.id, existing.id));
    return publicId;
  }
  await db.insert(schema.accounts).values({ id: newId("acc"), publicId, email, name: name ?? null });
  return publicId;
}

/**
 * Mint a fresh email-verification token for an account and store only its hash
 * (24h expiry). Returns the plaintext token to embed in the verification link.
 */
export async function createEmailVerification(accountId: string): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db
    .update(schema.accounts)
    .set({ emailVerifyToken: hashApiKey(token), emailVerifyExpires: expires, updatedAt: new Date() })
    .where(eq(schema.accounts.id, accountId));
  return token;
}

/** Look up an account by (unverified) email, for resend flows. */
export async function accountIdByEmail(emailRaw: string): Promise<{ id: string; verified: boolean } | null> {
  const email = emailRaw.toLowerCase();
  const [a] = await db
    .select({ id: schema.accounts.id, verifiedAt: schema.accounts.emailVerifiedAt })
    .from(schema.accounts)
    .where(eq(schema.accounts.email, email))
    .limit(1);
  return a ? { id: a.id, verified: Boolean(a.verifiedAt) } : null;
}

/**
 * Consume a verification token: mark the email verified and clear the token.
 * Returns true on success, false if the token is unknown/expired/already used.
 */
export async function verifyEmailToken(plainToken: string): Promise<boolean> {
  const token = plainToken.trim();
  if (!token) return false;
  const [updated] = await db
    .update(schema.accounts)
    .set({ emailVerifiedAt: new Date(), emailVerifyToken: null, emailVerifyExpires: null, updatedAt: new Date() })
    .where(
      and(
        eq(schema.accounts.emailVerifyToken, hashApiKey(token)),
        gt(schema.accounts.emailVerifyExpires, new Date()),
      ),
    )
    .returning({ id: schema.accounts.id });
  return Boolean(updated);
}

/** Verify email + password. Returns the account on success, else null. Upgrades
 *  to platform admin if the email is now in PLATFORM_ADMIN_EMAILS. */
export async function loginWithPassword(
  emailRaw: string,
  password: string,
): Promise<AccountView | null> {
  const email = emailRaw.toLowerCase();
  const [a] = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.email, email))
    .limit(1);
  if (!a || !a.passwordHash) return null;
  if (!(await verifyPassword(a.passwordHash, password))) return null;

  if (!a.isPlatformAdmin && env.PLATFORM_ADMIN_EMAILS.includes(email)) {
    const [updated] = await db
      .update(schema.accounts)
      .set({ isPlatformAdmin: true, updatedAt: new Date() })
      .where(eq(schema.accounts.id, a.id))
      .returning();
    return view(updated!);
  }
  return view(a);
}

export interface VerifiedLogin {
  account: { publicId: string | null; email: string; name: string | null };
  /** The person's role in the named company (ACTIVE membership), else null. */
  role: string | null;
}

/**
 * Machine login verification for a product node (the firm app delegating auth to
 * the platform). Verifies the central account password and, when a company is
 * named, requires an ACTIVE membership of it. Returns the portable identity +
 * company role, or null on any failure. Never issues a platform session.
 */
export async function verifyLogin(input: {
  email: string;
  password: string;
  company?: string;
}): Promise<VerifiedLogin | null> {
  const account = await loginWithPassword(input.email, input.password);
  if (!account) return null;
  let role: string | null = null;
  if (input.company) {
    const res = await resolveCompany(input.company);
    if (res.mode === "not_found") return null;
    if (res.mode === "company") {
      const orgId = await orgIdFromHandle(input.company);
      if (!orgId) return null;
      const m = await membership(account.id, orgId);
      if (!m) return null; // not an ACTIVE member of the named company
      role = m.role;
    }
    // res.mode === "admin" → an AORMS-owner login; no firm company role.
  }
  return {
    account: { publicId: account.publicId, email: account.email, name: account.name },
    role,
  };
}
