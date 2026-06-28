import { ActivateInput, RefreshInput, ValidateInput } from "@esti/contracts";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { db, schema } from "../db/client.js";
import { hashApiKey } from "../lib/apikey.js";
import { activate, entitlement, refresh, validate } from "../modules/licenseApi/service.js";

interface ProductAuth {
  productId: string;
  productCode: string;
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
  return { productId: product.id, productCode: product.code };
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
