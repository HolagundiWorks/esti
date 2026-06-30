import { eq, or } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../../../auth/session.js";
import { db, schema } from "../../db/client.js";
import { env } from "../../env.js";
import { newId } from "../../lib/ids.js";

export interface AccountView {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isPlatformAdmin: boolean;
}

type AccountRow = typeof schema.accounts.$inferSelect;

function view(a: AccountRow): AccountView {
  return {
    id: a.id,
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
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.email, email))
    .limit(1);
  if (existing) throw new Error("email_taken");

  const passwordHash = await hashPassword(input.password);
  const grantAdmin = env.PLATFORM_ADMIN_EMAILS.includes(email);
  const [created] = await db
    .insert(schema.accounts)
    .values({
      id: newId("acc"),
      email,
      name: input.name ?? null,
      passwordHash,
      isPlatformAdmin: grantAdmin,
    })
    .returning();
  return view(created!);
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
