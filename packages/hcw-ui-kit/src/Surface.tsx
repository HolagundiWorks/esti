/**
 * Surface — the three-layer depth primitive. Pick the layer by the element's
 * ROLE, not by taste (HCW-UI-Kit thesis: depth encodes importance):
 *
 *   layer="flat"  → hyperminimalist. Information at rest: tables, text, lists.
 *   layer="soft"  → neumorphic. An object you work within: widget, highlight
 *                    card, panel. Extruded off the canvas.
 *   layer="glass" → glassmorphism. The live/floating layer: CTAs, the action
 *                    dock, priority alerts, an active/important widget.
 *
 *   <Surface layer="soft" sx={{ p: 2 }}>…a summary card…</Surface>
 */
import { Box, type BoxProps } from "@mui/material";
import { LAYERS, type SurfaceLayer } from "./tokens.js";

export type { SurfaceLayer };

export function Surface({ layer = "flat", sx, ...rest }: { layer?: SurfaceLayer } & BoxProps) {
  return <Box sx={{ ...LAYERS[layer], ...sx }} {...rest} />;
}

export default Surface;
