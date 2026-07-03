import type { UserType } from "@esti/contracts";
import { hashPassword } from "../auth/session.js";
import type { DB } from "../db/index.js";
import { users } from "../db/schema.js";
import { env } from "../env.js";
import { emailMatches } from "./email.js";
import { eq } from "drizzle-orm";

/** Is firm login delegated to the central identity platform? */
export function delegationEnabled(): boolean {
  return env.ESTI_IDENTITY_DELEGATE && Boolean(identityBase());
}

function identityBase(): string {
  return (env.ESTI_IDENTITY_URL || env.ESTI_LICENSE_API_URL).replace(/\/+$/, "");
}

/** Is a hub reachable to resolve AORMS-U handles against (the real account store)? */
export function identityLookupConfigured(): boolean {
  return Boolean(identityBase()) && Boolean(env.ESTI_PRODUCT_API_KEY);
}

export interface VerifiedAccount {
  publicId: string;
  email: string;
  name: string | null;
}

export type VerifyIdentityResult =
  | { kind: "ok"; account: VerifiedAccount }
  | { kind: "not_found" }
  | { kind: "unreachable" };

/**
 * Look up an AORMS-U handle on the hub's `/v1/verify-identity`. A node's own
 * local `hlp_account` table is an unpopulated per-install schema shadow, not
 * the real account store — this is the machine-to-machine call `linkIdentity`
 * needs instead of querying its own DB (see AORMS-IDENTITY.md §11, U-3).
 */
export async function verifyIdentityAtPlatform(publicId: string): Promise<VerifyIdentityResult> {
  const base = identityBase();
  if (!base || !env.ESTI_PRODUCT_API_KEY) return { kind: "unreachable" };
  let res: Response;
  try {
    res = await fetch(`${base}/v1/verify-identity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.ESTI_PRODUCT_API_KEY}`,
      },
      body: JSON.stringify({ publicId }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { kind: "unreachable" };
  }
  if (res.status === 404) return { kind: "not_found" };
  if (!res.ok) return { kind: "unreachable" };
  const body = (await res.json().catch(() => null)) as
    | { ok?: boolean; account?: VerifiedAccount }
    | null;
  if (!body?.ok || !body.account) return { kind: "not_found" };
  return { kind: "ok", account: body.account };
}

/**
 * Earned identity (Phase 34) — ask the hub to mint the permanent AORMS-U handle
 * for a person who crossed the usage threshold on this node. The node enforces
 * eligibility; the hub guarantees mint-once semantics. Null on any failure.
 */
export async function generateIdentityAtPlatform(
  email: string,
  name?: string | null,
): Promise<string | null> {
  const base = identityBase();
  if (!base || !env.ESTI_PRODUCT_API_KEY) return null;
  try {
    const res = await fetch(`${base}/v1/generate-identity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.ESTI_PRODUCT_API_KEY}`,
      },
      body: JSON.stringify({ email, name: name ?? undefined }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as
      | { ok?: boolean; publicId?: string }
      | null;
    return body?.ok && body.publicId ? body.publicId : null;
  } catch {
    return null;
  }
}

/** Is a hub configured to stamp this node's memberships with a `userType()`? */
export function membershipSyncConfigured(): boolean {
  return identityLookupConfigured() && Boolean(env.ESTI_COMPANY);
}

/**
 * Best-effort push of a linked person's derived `userType()` onto their hub
 * membership row (U-3b, the other half of the sync protocol). Never throws —
 * this is supplementary central bookkeeping, not required for the local link
 * to succeed; a failure here just leaves the hub's `hlp_org_member.account_type`
 * unset until the next successful sync.
 */
export async function syncMembershipAtPlatform(publicId: string, accountType: UserType): Promise<boolean> {
  const base = identityBase();
  if (!base || !env.ESTI_PRODUCT_API_KEY || !env.ESTI_COMPANY) return false;
  try {
    const res = await fetch(`${base}/v1/sync-membership`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.ESTI_PRODUCT_API_KEY}`,
      },
      body: JSON.stringify({ publicId, company: env.ESTI_COMPANY, accountType }),
      signal: AbortSignal.timeout(15_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface DelegatedIdentity {
  account: { publicId: string | null; email: string; name: string | null };
  role: string | null;
}

export type DelegateResult =
  | { kind: "ok"; identity: DelegatedIdentity }
  | { kind: "invalid" } // reached the platform; credentials/membership rejected
  | { kind: "unreachable" }; // network/timeout — caller may use offline grace

/**
 * Verify a firm login against the central platform's `/v1/verify-login` using the
 * product API key. Passes this firm's company handle so membership is enforced.
 */
export async function verifyAtPlatform(email: string, password: string): Promise<DelegateResult> {
  const base = identityBase();
  if (!base || !env.ESTI_PRODUCT_API_KEY) return { kind: "unreachable" };
  let res: Response;
  try {
    res = await fetch(`${base}/v1/verify-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.ESTI_PRODUCT_API_KEY}`,
      },
      body: JSON.stringify({ email, password, company: env.ESTI_COMPANY || undefined }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { kind: "unreachable" };
  }
  if (res.status === 401 || res.status === 400) return { kind: "invalid" };
  if (!res.ok) return { kind: "unreachable" };
  const body = (await res.json().catch(() => null)) as
    | { ok?: boolean; account?: DelegatedIdentity["account"]; role?: string | null }
    | null;
  if (!body?.ok || !body.account) return { kind: "invalid" };
  return { kind: "ok", identity: { account: body.account, role: body.role ?? null } };
}

/**
 * Project a verified central identity onto a local firm user (I-5). Links an
 * existing row by AORMS-U handle or email, else creates a fresh staff login. The
 * password is cached locally (hashed) so the account still opens offline. Never
 * grants OWNER automatically — new delegated users land as ASSOCIATE.
 */
export async function provisionLocalUser(
  db: DB,
  identity: DelegatedIdentity,
  plainPassword: string,
): Promise<typeof users.$inferSelect | null> {
  const publicId = identity.account.publicId;
  const email = identity.account.email.trim().toLowerCase();
  const passwordHash = await hashPassword(plainPassword);

  // 1) Existing row already linked to this person.
  if (publicId) {
    const [linked] = await db
      .select()
      .from(users)
      .where(eq(users.accountPublicId, publicId))
      .limit(1);
    if (linked) {
      const [u] = await db
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, linked.id))
        .returning();
      return u ?? null;
    }
  }

  // 2) Existing row by email → link it (and cache the password).
  const [byEmail] = await db.select().from(users).where(emailMatches(users.email, email)).limit(1);
  if (byEmail) {
    const [u] = await db
      .update(users)
      .set({ accountPublicId: publicId ?? byEmail.accountPublicId, passwordHash })
      .where(eq(users.id, byEmail.id))
      .returning();
    return u ?? null;
  }

  // 3) New staff login projected from the central identity.
  const [created] = await db
    .insert(users)
    .values({
      email,
      fullName: identity.account.name ?? email,
      role: "ASSOCIATE",
      passwordHash,
      accountPublicId: publicId,
    })
    .returning();
  return created ?? null;
}

/** Guard used by delegated login: a disabled projection cannot sign in. */
export function isLoginable(u: { disabled: boolean } | null | undefined): boolean {
  return !!u && !u.disabled;
}
