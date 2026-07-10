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
 *
 * **Modal exception:** while a create/edit `Dialog` is open, publish `[]` so the
 * dock does not compete with `DialogActions` (commit stays in the dialog). Re-publish
 * screen actions when the dialog closes.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Box, Button, Tooltip } from "@mui/material";
import { colors, GLASS_SURFACE, NEU_RAISED, REDUCE_MOTION, FOCUS_RING } from "./tokens.js";

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

function DockButton({
  action,
  tabIndex,
  innerRef,
}: {
  action: DockAction;
  /** Roving tabindex: only the active toolbar item is 0, the rest are -1. */
  tabIndex?: number;
  innerRef?: (el: HTMLButtonElement | null) => void;
}) {
  const ink = toneColor(action.tone);
  const btn = (
    <Button
      ref={innerRef}
      tabIndex={tabIndex}
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
        // Keyboard parity: focus lifts to the glass slab and shows the accent ring.
        "&:focus-visible": { ...GLASS_SURFACE, ...FOCUS_RING, color: ink, transform: "translateY(-3px)" },
        "&.Mui-disabled": { opacity: 0.4 },
        [REDUCE_MOTION]: {
          transition: "none",
          "&:hover": { transform: "none" },
          "&:focus-visible": { transform: "none" },
        },
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

function Divider() {
  return <Box aria-hidden sx={{ width: "1px", alignSelf: "stretch", my: 0.5, background: colors.borderSubtle }} />;
}

export function ActionDock() {
  const actions = useDockActions();
  const btnRefs = useRef(new Map<string, HTMLButtonElement>());
  const [rovingId, setRovingId] = useState<string | null>(null);

  const left = actions.filter((a) => a.zone === "left");
  const center = actions.filter((a) => a.zone === "center");
  const right = actions.filter((a) => a.zone === "right");
  // Visual reading order = keyboard order: left → center → right.
  const ordered = [...left, ...center, ...right];
  const enabled = ordered.filter((a) => !a.disabled);

  // Reserve scroll space under content — same 16px gutter as shell sides.
  useEffect(() => {
    const shell = document.querySelector(".esti-app-shell2");
    if (!shell) return;
    shell.classList.toggle("esti-app-shell2--dock-visible", actions.length > 0);
    return () => shell.classList.remove("esti-app-shell2--dock-visible");
  }, [actions.length]);

  // The roving target stays valid as screens republish: keep the tracked id while
  // it's still an enabled action, else fall back to the first enabled one.
  const activeId =
    rovingId && enabled.some((a) => a.id === rovingId) ? rovingId : (enabled[0]?.id ?? null);

  if (actions.length === 0) return null;

  const focusId = (id: string | undefined) => {
    if (!id) return;
    setRovingId(id);
    btnRefs.current.get(id)?.focus();
  };

  // WAI-ARIA toolbar keyboard model: one Tab stop, then arrows/Home/End move
  // focus between the (enabled) action buttons, wrapping at the ends.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (enabled.length === 0) return;
    const idx = enabled.findIndex((a) => a.id === activeId);
    if (idx < 0) return;
    let next = idx;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (idx + 1) % enabled.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (idx - 1 + enabled.length) % enabled.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = enabled.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    focusId(enabled[next]?.id);
  };

  const dockProps = (a: DockAction) => ({
    tabIndex: a.disabled ? -1 : a.id === activeId ? 0 : -1,
    innerRef: (el: HTMLButtonElement | null) => {
      if (el) btnRefs.current.set(a.id, el);
      else btnRefs.current.delete(a.id);
    },
  });

  const zones = [left, center, right].filter((z) => z.length > 0);

  return (
    <Box
      role="toolbar"
      aria-label="Screen actions"
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      sx={{
        position: "fixed",
        left: "50%",
        // App shell: 72px clears the taskbar. Marketing (no footer) sets
        // --esti-dock-bottom on .lp2-shell (see landing.scss).
        bottom: "var(--esti-dock-bottom, 72px)",
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
          <Box sx={{ display: "flex", gap: 1 }}>
            {z.map((a) => (
              <DockButton key={a.id} action={a} {...dockProps(a)} />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export default ActionDock;
