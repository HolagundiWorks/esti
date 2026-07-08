/**
 * ActionDock — the single, global, context-aware action bar. Every screen's CTAs
 * live here, not inline. A screen publishes its actions with `useScreenActions`;
 * the dock renders them in three fixed zones for muscle memory:
 *
 *   LEFT   = exit / destroy   (Delete · Discard · Cancel)      — red tone
 *   CENTER = generate         (Add · Create · New)             — orange (primary)
 *   RIGHT  = commit           (Save · Edit · Save changes)     — orange (primary)
 *
 * Buttons are neumorphic at rest (Layer 2) and lift to glass on hover (Layer 3) —
 * actionability itself is what glows. The dock floats bottom-centre, above the
 * taskbar footer, and hides when no screen has published actions.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Box, Button, Tooltip } from "@mui/material";
import { colors, GLASS_SURFACE, NEU_RAISED } from "./tokens.js";

export type DockZone = "left" | "center" | "right";
export type DockTone = "default" | "primary" | "danger";

export interface DockAction {
  id: string;
  label: string;
  zone: DockZone;
  onClick: () => void;
  icon?: ReactNode;
  tone?: DockTone;
  disabled?: boolean;
  /** Show only the icon (label still used as the tooltip / aria-label). */
  iconOnly?: boolean;
}

interface DockContextValue {
  actions: DockAction[];
  publish: (actions: DockAction[]) => void;
  clear: () => void;
}

const DockContext = createContext<DockContextValue | null>(null);

export function ActionDockProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<DockAction[]>([]);
  const value = useMemo<DockContextValue>(
    () => ({ actions, publish: setActions, clear: () => setActions([]) }),
    [actions],
  );
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}

/**
 * Publish the current screen's actions to the global dock. Pass a `deps` array
 * (like useEffect) so the dock re-syncs when the actions' handlers/state change.
 * Actions clear automatically when the screen unmounts.
 */
export function useScreenActions(actions: DockAction[], deps: unknown[] = []): void {
  const ctx = useContext(DockContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.publish(actions);
    return () => ctx.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useDockActions(): DockAction[] {
  return useContext(DockContext)?.actions ?? [];
}

function toneColor(tone: DockTone = "default"): string {
  if (tone === "danger") return colors.supportError;
  if (tone === "primary") return colors.accent;
  return colors.ink;
}

function DockButton({ action }: { action: DockAction }) {
  const ink = toneColor(action.tone);
  const btn = (
    <Button
      onClick={action.onClick}
      disabled={action.disabled}
      startIcon={action.iconOnly ? undefined : action.icon}
      aria-label={action.label}
      sx={{
        ...NEU_RAISED,
        color: ink,
        minWidth: action.iconOnly ? 44 : 64,
        px: action.iconOnly ? 1.25 : 2,
        py: 1,
        fontWeight: action.tone === "primary" ? 700 : 600,
        transition: "transform 130ms ease, box-shadow 130ms ease, background 130ms ease",
        "&:hover": { ...GLASS_SURFACE, color: ink, transform: "translateY(-3px)" },
        "&.Mui-disabled": { opacity: 0.4 },
      }}
    >
      {action.iconOnly ? action.icon : action.label}
    </Button>
  );
  return action.iconOnly ? (
    <Tooltip title={action.label}>
      <span>{btn}</span>
    </Tooltip>
  ) : (
    btn
  );
}

function Zone({ actions }: { actions: DockAction[] }) {
  if (actions.length === 0) return null;
  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      {actions.map((a) => (
        <DockButton key={a.id} action={a} />
      ))}
    </Box>
  );
}

function Divider() {
  return <Box aria-hidden sx={{ width: "1px", alignSelf: "stretch", my: 0.5, background: colors.borderSubtle }} />;
}

export function ActionDock() {
  const actions = useDockActions();
  if (actions.length === 0) return null;
  const left = actions.filter((a) => a.zone === "left");
  const center = actions.filter((a) => a.zone === "center");
  const right = actions.filter((a) => a.zone === "right");
  const zones = [left, center, right].filter((z) => z.length > 0);

  return (
    <Box
      role="toolbar"
      aria-label="Screen actions"
      sx={{
        position: "fixed",
        left: "50%",
        bottom: 72, // clears the 56px taskbar footer
        transform: "translateX(-50%)",
        zIndex: 1250,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1.5,
        py: 1,
        ...NEU_RAISED,
      }}
    >
      {zones.map((z, i) => (
        <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {i > 0 && <Divider />}
          <Zone actions={z} />
        </Box>
      ))}
    </Box>
  );
}

export default ActionDock;
