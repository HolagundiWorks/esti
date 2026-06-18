import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { deviceSessions, users } from "../db/schema.js";
import type { AuthUser } from "./session.js";

const ACCESS_TTL_MS = 1000 * 60 * 60; // 1h
const REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30d

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export type DeviceTokenPair = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
  sessionId: string;
};

export async function createDeviceSession(
  db: DB,
  input: { userId: string; deviceName: string; clientId: string },
): Promise<DeviceTokenPair> {
  const accessToken = newToken();
  const refreshToken = newToken();
  const accessExpiresAt = new Date(Date.now() + ACCESS_TTL_MS);
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  const [row] = await db
    .insert(deviceSessions)
    .values({
      userId: input.userId,
      clientId: input.clientId,
      deviceName: input.deviceName,
      accessTokenHash: hashToken(accessToken),
      refreshTokenHash: hashToken(refreshToken),
      accessExpiresAt,
      refreshExpiresAt,
      lastUsedAt: new Date(),
    })
    .returning({ id: deviceSessions.id });

  return {
    accessToken,
    refreshToken,
    accessExpiresAt,
    refreshExpiresAt,
    sessionId: row!.id,
  };
}

export async function refreshDeviceAccessToken(
  db: DB,
  input: { refreshToken: string; clientId: string },
): Promise<DeviceTokenPair | null> {
  const refreshHash = hashToken(input.refreshToken);
  const rows = await db
    .select()
    .from(deviceSessions)
    .where(
      and(
        eq(deviceSessions.refreshTokenHash, refreshHash),
        eq(deviceSessions.clientId, input.clientId),
        gt(deviceSessions.refreshExpiresAt, new Date()),
        isNull(deviceSessions.revokedAt),
      ),
    )
    .limit(1);
  const session = rows[0];
  if (!session) return null;

  const accessToken = newToken();
  const accessExpiresAt = new Date(Date.now() + ACCESS_TTL_MS);

  await db
    .update(deviceSessions)
    .set({
      accessTokenHash: hashToken(accessToken),
      accessExpiresAt,
      lastUsedAt: new Date(),
    })
    .where(eq(deviceSessions.id, session.id));

  return {
    accessToken,
    refreshToken: input.refreshToken,
    accessExpiresAt,
    refreshExpiresAt: session.refreshExpiresAt,
    sessionId: session.id,
  };
}

export async function userFromDeviceToken(
  db: DB,
  accessToken: string | undefined,
): Promise<(AuthUser & { deviceSessionId: string }) | null> {
  if (!accessToken) return null;
  const rows = await db
    .select({
      deviceSessionId: deviceSessions.id,
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      clientId: users.clientId,
      consultantId: users.consultantId,
      isDemo: users.isDemo,
    })
    .from(deviceSessions)
    .innerJoin(users, eq(users.id, deviceSessions.userId))
    .where(
      and(
        eq(deviceSessions.accessTokenHash, hashToken(accessToken)),
        gt(deviceSessions.accessExpiresAt, new Date()),
        gt(deviceSessions.refreshExpiresAt, new Date()),
        isNull(deviceSessions.revokedAt),
        eq(users.disabled, false),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  await db
    .update(deviceSessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(deviceSessions.id, row.deviceSessionId));

  return row as AuthUser & { deviceSessionId: string };
}

export async function revokeDeviceSession(db: DB, sessionId: string): Promise<void> {
  await db
    .update(deviceSessions)
    .set({ revokedAt: new Date() })
    .where(eq(deviceSessions.id, sessionId));
}
