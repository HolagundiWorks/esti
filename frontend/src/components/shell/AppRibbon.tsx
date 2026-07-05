import { Box, Button, Stack, Tab, Tabs } from "@mui/material";
import { useEffect, useState, type ComponentType } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

/**
 * Top ribbon navigation — Excel/Office-style. Replaces the left side-nav.
 *   Row 1: ribbon TABS (top-level sections).
 *   Row 2: the selected tab's leaf destinations as square-icon command buttons.
 * The active tab tracks the current route. Liquid-glass surface, square icons.
 */
// Icon is a Carbon or MUI icon component — both are structurally `ComponentType`.
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

export function AppRibbon({ nav }: { nav: RibbonNode[] }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Active top-level tab = the section whose leaves contain the current route.
  const activeTop = Math.max(
    0,
    nav.findIndex((n) => leaves(n).some((l) => pathActive(pathname, l.to))),
  );
  const [selected, setSelected] = useState(activeTop);
  useEffect(() => setSelected(activeTop), [activeTop]);

  const current = nav[selected];
  const commands = current ? leaves(current) : [];

  return (
    <Box className="esti-ribbon">
      <Tabs
        value={selected}
        onChange={(_e, v: number) => {
          setSelected(v);
          const node = nav[v];
          if (node && !("items" in node)) navigate(node.to);
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

      <Stack direction="row" spacing={0.5} className="esti-ribbon__row">
        {commands.map((c) => {
          const Icon = c.icon;
          const active = pathActive(pathname, c.to);
          return (
            <Button
              key={c.to}
              component={Link}
              to={c.to}
              size="small"
              color={active ? "primary" : "inherit"}
              variant={active ? "outlined" : "text"}
              startIcon={Icon ? <Icon size={18} /> : undefined}
              sx={{ flexShrink: 0 }}
            >
              {c.label}
            </Button>
          );
        })}
      </Stack>
    </Box>
  );
}
