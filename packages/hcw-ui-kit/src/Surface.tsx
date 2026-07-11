/**
 * Surface — the depth primitive. Pick the layer by the element's ROLE, not by
 * taste (HCW-UI-Kit thesis: depth encodes importance):
 *
 *   layer="flat"         → hyperminimalist. Information at rest.
 *   layer="soft"         → neumorphic. Object you work within.
 *   layer="glass"        → frosted glass. Dock, alerts, active widgets.
 *   layer="clearGlass"   → translucent glass (marketing rail) — atmosphere shows through.
 *   layer="headingGlass" → full-width section opener glass (marketing hierarchy).
 *
 *   <Surface layer="soft" sx={{ p: 2 }}>…a summary card…</Surface>
 *
 * All surfaces are **square** (borderRadius 0) except ActionDock (`ACTION_DOCK_TRAY`
 * capsule) and generic MuiButton (`BUTTON_RADIUS`).
 */
import { Box, type BoxProps } from "@mui/material";
import { LAYERS, type SurfaceLayer } from "./tokens.js";

export type { SurfaceLayer };

const SQUARE = { borderRadius: 0 } as const;

export function Surface({ layer = "flat", sx, ...rest }: { layer?: SurfaceLayer } & BoxProps) {
  return (
    <Box
      className="hcw-surface"
      sx={[LAYERS[layer], SQUARE, ...(sx == null ? [] : Array.isArray(sx) ? sx : [sx]), SQUARE]}
      {...rest}
    />
  );
}

export default Surface;
