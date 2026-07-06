import { Box, Button, Stack, Tab, Tabs } from "@mui/material";
import { useEffect, useState, type ComponentType } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

/**
 * Top ribbon navigation — Excel/Office-style. Replaces the left side-nav and the
 * top header bar (there is no separate header).
 *   Row 1: firm name as an h1 (40% width) followed by the section TABS.
 *   Row 2: the selected tab's leaf destinations as square-icon command buttons.
 * The active tab tracks the current route. Liquid-glass surface, square icons.
 */
export type RibbonLink = { label: string; to: string; icon?: ComponentType<any> };
export type RibbonNode =
  | (RibbonLink & { kind?: "link" })
  | { kind: "menu"; label: string; icon?: ComponentType<any>; items: RibbonNode[] };

function leaves(node: RibbonNode): RibbonLink[] {
  return "items" in node ? node.items.flatMap(leaves) : [node];
}

function pathActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppRibbon({ nav, firmName }: { nav: RibbonNode[]; firmName: string }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // -1 when the route is not under any tab (e.g. Studio Intelligence "/") → no tab
  // is marked active.
  const activeTop = nav.findIndex((n) => leaves(n).some((l) => pathActive(pathname, l.to)));
  const [selected, setSelected] = useState(activeTop >= 0 ? activeTop : 0);
  useEffect(() => {
    if (activeTop >= 0) setSelected(activeTop);
  }, [activeTop]);

  const current = nav[selected];
  const commands = current ? leaves(current) : [];

  // Auto-hide the command row: it only shows when a tab is active (activeTop >= 0)
  // or while hovering the ribbon. When a dock item is active (Studio Intelligence,
  // Tasks) the route matches no tab, so the row collapses and only the tabs stay.
  const [hover, setHover] = useState(false);
  const showCommands = activeTop >= 0 || hover;

  return (
    <Box
      className="esti-ribbon"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Row 1: firm-name h1 (40%) + section tabs */}
      <Box className="esti-ribbon__nav">
        <h1 className="esti-ribbon__title" title={firmName}>{firmName}</h1>
        <Box sx={{ flex: 1 }} />
        <Tabs
          value={activeTop >= 0 ? selected : false}
          onChange={(_e, v: number) => {
            setSelected(v);
            // Any tab (leaf or multi-item menu) navigates straight to its first
            // ribbon destination — no second click needed to enter a menu.
            const node = nav[v];
            const first = node ? leaves(node)[0] : undefined;
            if (first) navigate(first.to);
          }}
          variant="scrollable"
          allowScrollButtonsMobile
          aria-label="Primary navigation"
          sx={{ minHeight: 40, "& .MuiTab-root": { minHeight: 40, py: 0 } }}
        >
          {nav.map((n) => (
            <Tab key={n.label} label={n.label} />
          ))}
        </Tabs>
      </Box>

      {showCommands && (
      <Stack direction="row" spacing={0.5} className="esti-ribbon__row">
        {commands.map((c) => {
          const Icon = c.icon;
          const active = pathActive(pathname, c.to);
          return (
            <Button
              key={c.to}
              component={Link}
              to={c.to}
              color={active ? "primary" : "inherit"}
              variant={active ? "outlined" : "text"}
              sx={{
                flexShrink: 0,
                flexDirection: "column",
                gap: 0.25,
                minWidth: 76,
                height: 56,
                px: 1,
                fontSize: 11,
                lineHeight: 1.15,
                textTransform: "none",
              }}
            >
              {Icon ? <Icon sx={{ fontSize: 22 }} /> : <span />}
              {c.label}
            </Button>
          );
        })}
      </Stack>
      )}
    </Box>
  );
}
