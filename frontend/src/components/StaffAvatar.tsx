import type React from "react";
import { ROLE_TO_DISPLAY_LEVEL, STAFF_LEVEL_COLOR } from "@esti/contracts";

/** Stable hash color from STAFF_LEVEL_COLOR palette — single source of truth in contracts. */
const LEVEL_COLORS = Object.values(STAFF_LEVEL_COLOR);

export function nameColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return LEVEL_COLORS[h % LEVEL_COLORS.length]!;
}

/** Resolve card colour: prefer staffLevel, fall back to auth role, then hash. */
export function resolveColor(opts: {
  staffLevel?: string | null;
  authRole?: string | null;
  name?: string;
}): string {
  if (opts.staffLevel && STAFF_LEVEL_COLOR[opts.staffLevel])
    return STAFF_LEVEL_COLOR[opts.staffLevel]!;
  if (opts.authRole) {
    const level = ROLE_TO_DISPLAY_LEVEL[opts.authRole];
    if (level && STAFF_LEVEL_COLOR[level]) return STAFF_LEVEL_COLOR[level]!;
  }
  return opts.name ? nameColor(opts.name) : LEVEL_COLORS[0]!;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => /^[A-Za-z]/.test(p));
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0]![0] ?? "?").toUpperCase();
  return ((parts[0]![0] ?? "") + (parts[parts.length - 1]![0] ?? "")).toUpperCase();
}

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
const SIZE_PX: Record<AvatarSize, number> = { xs: 20, sm: 28, md: 36, lg: 48, xl: 96 };
const FONT_PX: Record<AvatarSize, number> = { xs: 9, sm: 11, md: 13, lg: 16, xl: 32 };

interface StaffAvatarProps {
  name: string;
  photoUrl?: string | null;
  /** Display-facing level (L1–L4, T1–T3). Takes priority over authRole. */
  staffLevel?: string | null;
  /** Auth role (OWNER, PARTNER, etc.) — used if staffLevel not set. */
  authRole?: string | null;
  size?: AvatarSize;
  className?: string;
}

/** Circular staff avatar — photo when available, initials otherwise. Colour follows level hierarchy. */
export function StaffAvatar({ name, photoUrl, staffLevel, authRole, size = "md", className }: StaffAvatarProps) {
  const bg = resolveColor({ staffLevel, authRole, name });
  const px = SIZE_PX[size];
  const fp = FONT_PX[size];

  return (
    <span
      className={`esti-staff-avatar${className ? ` ${className}` : ""}`}
      style={{ width: px, height: px, minWidth: px, "--esti-staff-color": bg, "--esti-staff-fs": fp } as React.CSSProperties}
      title={name}
      aria-label={name}
    >
      {photoUrl ? (
        <img src={photoUrl} alt={name} />
      ) : (
        <span aria-hidden>{getInitials(name)}</span>
      )}
    </span>
  );
}
