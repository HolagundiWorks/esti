/**
 * StaffAvatar — app wrapper over the kit `Avatar` (promoted 2026-07). The kit
 * owns the circular presentation; this file keeps the DOMAIN colour logic
 * (staff-level palette from `@esti/contracts`) and injects it as `color` —
 * same injection pattern as PageBreadcrumb's linkComponent.
 */
import { Avatar, getInitials } from "@hcw/ui-kit";
import { ROLE_TO_DISPLAY_LEVEL, STAFF_LEVEL_COLOR } from "@esti/contracts";

export { getInitials };

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

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

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
  return (
    <Avatar
      name={name}
      photoUrl={photoUrl}
      color={resolveColor({ staffLevel, authRole, name })}
      size={size}
      className={className}
    />
  );
}
