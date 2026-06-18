import { z } from "zod";

export const CompanionClientId = z.enum(["esticad"]);
export type CompanionClientId = z.infer<typeof CompanionClientId>;

export const DeviceLoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  deviceName: z.string().min(1).max(120).default("ESTICAD"),
  clientId: CompanionClientId.default("esticad"),
});
export type DeviceLoginInput = z.infer<typeof DeviceLoginInput>;

export const DeviceRefreshInput = z.object({
  refreshToken: z.string().min(20).max(500),
  clientId: CompanionClientId.default("esticad"),
});
export type DeviceRefreshInput = z.infer<typeof DeviceRefreshInput>;

export const DeviceLoginResult = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accessExpiresAt: z.string().datetime(),
  refreshExpiresAt: z.string().datetime(),
  userId: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  role: z.string(),
});
export type DeviceLoginResult = z.infer<typeof DeviceLoginResult>;

export const CompanionCapabilities = z.object({
  takeoff: z.boolean(),
  ai: z.boolean(),
  firmName: z.string(),
  subscriptionActive: z.boolean(),
});
export type CompanionCapabilities = z.infer<typeof CompanionCapabilities>;
