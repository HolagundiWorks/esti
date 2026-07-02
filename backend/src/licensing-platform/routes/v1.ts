import {
  ActivateInput,
  RefreshInput,
  SyncMembershipInput,
  ValidateInput,
  VerifyIdentityInput,
} from "@esti/contracts";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { db, schema } from "../db/client.js";
import { hashApiKey } from "../lib/apikey.js";
import { verifyLogin } from "../modules/auth/service.js";
import { orgIdFromHandle } from "../modules/auth/tenant.js";
import { activate, entitlement, refresh, validate } from "../modules/licenseApi/service.js";

interface ProductAuth {
  productId: string;
  productCode: string;
  /** Org this key is bound to, or null for a legacy product-wide key. */
  orgId: string | null;
}

/** Resolve the product from the `Authorization: Bearer <product-api-key>` header. */
async function authProduct(req: FastifyRequest): Promise<ProductAuth | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const plain = header.slice("Bearer ".length).trim();
  if (!plain) return null;

  const [key] = await db
    .select()
    .from(schema.apiKeys)
    .where(and(eq(schema.apiKeys.keyHash, hashApiKey(plain)), eq(schema.apiKeys.status, "ACTIVE")))
    .limit(1);
  if (!key) return null;
  const [product] = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, key.productId))
    .limit(1);
  if (!product) return null;

  await db
    .update(schema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKeys.id, key.id));
  return { productId: product.id, productCode: product.code, orgId: key.orgId ?? null };
}

/** Product License API (`/v1`) — machine-to-machine, per-product API key. */
export function registerV1Routes(app: FastifyInstance): void {
  app.post("/v1/activate", async (req, reply) => {
    const auth = await authProduct(req);
    if (!auth) {
      reply.code(401);
      return { error: "unauthorized" };
    }
    const parsed = ActivateInput.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_input" };
    }
    const r = await activate(auth.productId, auth.productCode, parsed.data);
    if (!r.ok) {
      reply.code(r.status);
      return { error: r.error };
    }
    return r.data;
  });

  // Machine login verification — a product node delegates firm auth to the
  // platform. Returns the portable identity (AORMS-U) + company role on success.
  app.post("/v1/verify-login", async (req, reply) => {
    const auth = await authProduct(req);
    if (!auth) {
      reply.code(401);
      return { error: "unauthorized" };
    }
    const body = req.body as { email?: string; password?: string; company?: string } | undefined;
    const email = body?.email?.trim().toLowerCase() ?? "";
    const password = body?.password ?? "";
    if (!email || !password) {
      reply.code(400);
      return { error: "invalid_input" };
    }
    const result = await verifyLogin({ email, password, company: body?.company?.trim() || undefined });
    if (!result) {
      reply.code(401);
      return { error: "invalid_credentials" };
    }
    return { ok: true, ...result };
  });

  // Machine identity lookup — a node's own `hlp_account` is an unpopulated
  // per-install shadow table; real accounts live only on the hub, so a node
  // asks here (rather than querying its own DB) to validate an AORMS-U handle
  // before linking it to a local firm login (I-5 `users.linkIdentity`).
  app.post("/v1/verify-identity", async (req, reply) => {
    const auth = await authProduct(req);
    if (!auth) {
      reply.code(401);
      return { error: "unauthorized" };
    }
    const parsed = VerifyIdentityInput.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_input" };
    }
    const [account] = await db
      .select({ id: schema.accounts.id, publicId: schema.accounts.publicId, email: schema.accounts.email, name: schema.accounts.name })
      .from(schema.accounts)
      .where(eq(schema.accounts.publicId, parsed.data.publicId))
      .limit(1);
    if (!account?.publicId) {
      reply.code(404);
      return { error: "not_found" };
    }
    // Org-bound key: only resolve people who are members of the key's own org —
    // it must not be able to look up an arbitrary person's email/name.
    if (auth.orgId) {
      const [member] = await db
        .select({ id: schema.orgMembers.id })
        .from(schema.orgMembers)
        .where(and(eq(schema.orgMembers.accountId, account.id), eq(schema.orgMembers.orgId, auth.orgId)))
        .limit(1);
      if (!member) {
        reply.code(404);
        return { error: "not_found" };
      }
    }
    return { ok: true, account: { publicId: account.publicId, email: account.email, name: account.name } };
  });

  // Machine membership sync — the other half of U-3b: a node stamps the linked
  // person's derived userType() onto their hub membership row, so the hub's
  // idea of "what is this person to this company" matches the node's.
  app.post("/v1/sync-membership", async (req, reply) => {
    const auth = await authProduct(req);
    if (!auth) {
      reply.code(401);
      return { error: "unauthorized" };
    }
    const parsed = SyncMembershipInput.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_input" };
    }
    const [account] = await db
      .select({ id: schema.accounts.id })
      .from(schema.accounts)
      .where(eq(schema.accounts.publicId, parsed.data.publicId))
      .limit(1);
    if (!account) {
      reply.code(404);
      return { error: "not_found" };
    }
    const orgId = await orgIdFromHandle(parsed.data.company);
    if (!orgId) {
      reply.code(404);
      return { error: "company_not_found" };
    }
    // Org-bound key: it may only sync memberships for its own org, never assert
    // a different company handle.
    if (auth.orgId && auth.orgId !== orgId) {
      reply.code(403);
      return { error: "org_mismatch" };
    }
    const [updated] = await db
      .update(schema.orgMembers)
      .set({ accountType: parsed.data.accountType })
      .where(and(eq(schema.orgMembers.accountId, account.id), eq(schema.orgMembers.orgId, orgId)))
      .returning({ id: schema.orgMembers.id });
    if (!updated) {
      reply.code(404);
      return { error: "not_a_member" };
    }
    return { ok: true };
  });

  app.post("/v1/validate", async (req, reply) => {
    const auth = await authProduct(req);
    if (!auth) {
      reply.code(401);
      return { error: "unauthorized" };
    }
    const parsed = ValidateInput.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_input" };
    }
    return validate(auth.productId, parsed.data.token); // always 200; { valid, ... }
  });

  app.post("/v1/refresh", async (req, reply) => {
    const auth = await authProduct(req);
    if (!auth) {
      reply.code(401);
      return { error: "unauthorized" };
    }
    const parsed = RefreshInput.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_input" };
    }
    const r = await refresh(auth.productId, auth.productCode, parsed.data.token, parsed.data.deviceId);
    if (!r.ok) {
      reply.code(r.status);
      return { error: r.error };
    }
    return r.data;
  });

  app.get("/v1/entitlement", async (req, reply) => {
    const auth = await authProduct(req);
    if (!auth) {
      reply.code(401);
      return { error: "unauthorized" };
    }
    const token = req.headers["x-license-token"];
    if (typeof token !== "string" || !token) {
      reply.code(400);
      return { error: "missing_license_token" };
    }
    const r = await entitlement(auth.productId, token);
    if (!r.ok) {
      reply.code(r.status);
      return { error: r.error };
    }
    return r.data;
  });
}
