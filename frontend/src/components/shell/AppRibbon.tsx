import {
  Box,
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
} from "@mui/material";
import { useState, type ComponentType } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

/**
 * Top navigation — the firm name (h1) followed by the section buttons. There is
 * no ribbon command row: a section that is a plain link navigates directly; a
 * section with children opens a dropdown menu of its destinations.
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

// Active nav reads as an underline (bottom line), not an outlined box.
const navSx = (active: boolean) => ({
  textTransform: "none",
  minHeight: 36,
  borderRadius: 0,
  color: active ? "text.primary" : "text.secondary",
  borderBottom: "2px solid",
  borderBottomColor: active ? "primary.main" : "transparent",
  "&:hover": {
    backgroundColor: "transparent",
    borderBottomColor: active ? "primary.main" : "divider",
  },
});

function SectionMenu({ node }: { node: Extract<RibbonNode, { kind: "menu" }> }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const items = leaves(node);
  const active = items.some((l) => pathActive(pathname, l.to));
  const go = (to: string) => { setAnchor(null); navigate(to); };

  return (
    <>
      <Button
        variant="text"
        color="inherit"
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={navSx(active)}
      >
        {node.label}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <MenuItem key={it.to} selected={pathActive(pathname, it.to)} onClick={() => go(it.to)}>
              {Icon && <ListItemIcon><Icon fontSize="small" /></ListItemIcon>}
              <ListItemText>{it.label}</ListItemText>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

export function AppRibbon({ nav, firmName }: { nav: RibbonNode[]; firmName: string }) {
  const { pathname } = useLocation();

  return (
    <Box className="esti-ribbon">
      <Box className="esti-ribbon__nav">
        <h1 className="esti-ribbon__title" title={firmName}>{firmName}</h1>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          {nav.map((n) =>
            "items" in n ? (
              <SectionMenu key={n.label} node={n} />
            ) : (
              <Button
                key={n.label}
                component={Link}
                to={n.to}
                variant="text"
                color="inherit"
                sx={navSx(pathActive(pathname, n.to))}
              >
                {n.label}
              </Button>
            ),
          )}
        </Stack>
      </Box>
    </Box>
  );
}
