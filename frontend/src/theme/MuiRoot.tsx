/**
 * MuiRoot lives in the centralised design system (@hcw/ui-kit); this app
 * wrapper feeds it the user's persisted colour-scheme preference (Settings →
 * Appearance). Light is the default; dark/high-contrast are preview-grade.
 */
import type { ReactNode } from "react";
import { MuiRoot as KitMuiRoot } from "@hcw/ui-kit";
import { useScheme } from "../lib/scheme.js";

export function MuiRoot({ children }: { children: ReactNode }) {
  const scheme = useScheme();
  return <KitMuiRoot scheme={scheme}>{children}</KitMuiRoot>;
}

export default MuiRoot;
