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

export const WorldGeometryPoint = z.object({ x: z.number(), y: z.number() });

export const WorldGeometry = z.object({
  type: z.enum(["LINE", "POLYLINE", "POLYGON", "POINT"]),
  points: z.array(WorldGeometryPoint).min(1),
});
export type WorldGeometry = z.infer<typeof WorldGeometry>;

export const CompanionLinkDrawing = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  /** When set, return the existing drawing instead of creating a new row. */
  drawingId: z.string().uuid().optional(),
});
export type CompanionLinkDrawing = z.infer<typeof CompanionLinkDrawing>;

export const CompanionDrawingSetScale = z.object({
  drawingId: z.string().uuid(),
  scaleUnit: z.string().min(1).max(8),
  /** Real-world units per one drawing unit (ESTICAD TOSCALE calibration). */
  scaleFactor: z.number().positive(),
});
export type CompanionDrawingSetScale = z.infer<typeof CompanionDrawingSetScale>;

export const DeviceSessionRow = z.object({
  id: z.string().uuid(),
  deviceName: z.string(),
  clientId: z.string(),
  userId: z.string().uuid(),
  userEmail: z.string().email(),
  userFullName: z.string(),
  lastUsedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type DeviceSessionRow = z.infer<typeof DeviceSessionRow>;
