import { eq, or } from "drizzle-orm";
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
