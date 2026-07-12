/**
 * HealthGlassOrb — zone / office-health indicator (glass variant).
 * Shape encodes severity without relying on colour alone:
 *   circle   = healthy / inactive
 *   triangle = caution (watch / friction)
 *   square   = critical
 *
 * Glass styling uses CSS class `hcw-health-glass-orb` (+ state modifier).
 * Host apps may map these to existing `.esti-zone-glass-orb*` rules until
 * glass.scss is fully shrunk (see HCW-UI-KIT.md).
 */
import type { CSSProperties } from "react";
export type HealthZoneState = "stable" | "watch" | "friction" | "critical" | "inactive";
export declare function HealthGlassOrb({ state, size, title, variant, className, style, }: {
    state: HealthZoneState;
    size?: number;
    title?: string;
    variant?: "flat" | "glass";
    className?: string;
    style?: CSSProperties;
}): import("react").JSX.Element;
//# sourceMappingURL=HealthGlassOrb.d.ts.map