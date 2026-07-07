import { Box, Button, Menu, MenuItem, Stack } from "@mui/material";
import { useRef, useState, type ComponentType } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

/**
 * Top navigation — the firm name (h1) followed by the section buttons. A plain
 * link navigates directly; a section with children opens a simple text-only
 * dropdown ON HOVER: no icons, its destinations divided by hairline separators.
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

function SectionMenu({
  node,
  open,
  onOpen,
  onClose,
}: {
  node: Extract<RibbonNode, { kind: "menu" }>;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const btnRef = useRef<HTMLButtonElement>(null);
  const items = leaves(node);
  const active = items.some((l) => pathActive(pathname, l.to));
  const go = (to: string) => { onClose(); navigate(to); };

  return (
    <>
      <Button
        ref={btnRef}
        variant="text"
        color="inherit"
        onMouseEnter={onOpen}
        onClick={onOpen}
        sx={navSx(active)}
      >
        {node.label}
      </Button>
      <Menu
        anchorEl={btnRef.current}
        open={open && Boolean(btnRef.current)}
        onClose={onClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        // Hover dropdown: no click-blocking backdrop, don't steal focus, and let
        // the pointer pass through the modal root so hovering other sections works.
        hideBackdrop
        disableAutoFocus
        disableEnforceFocus
        disableScrollLock
        sx={{ pointerEvents: "none" }}
        slotProps={{
          paper: { sx: { pointerEvents: "auto", mt: 0.25, minWidth: 180 } },
          list: { onMouseLeave: onClose, sx: { py: 0.5 } },
        }}
      >
        {items.map((it, i) => (
          <MenuItem
            key={it.to}
            selected={pathActive(pathname, it.to)}
            onClick={() => go(it.to)}
            sx={{
              // Text-only, divided by a hairline (last item has no rule).
              borderBottom: i < items.length - 1 ? 1 : 0,
              borderColor: "divider",
            }}
          >
            {it.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export function AppRibbon({ nav, firmName }: { nav: RibbonNode[]; firmName: string }) {
  const { pathname } = useLocation();
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <Box className="esti-ribbon">
      <Box className="esti-ribbon__nav">
        <h1 className="esti-ribbon__title" title={firmName}>{firmName}</h1>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          {nav.map((n) =>
            "items" in n ? (
              <SectionMenu
                key={n.label}
                node={n}
                open={openKey === n.label}
                onOpen={() => setOpenKey(n.label)}
                onClose={() => setOpenKey(null)}
              />
            ) : (
              <Button
                key={n.label}
                component={Link}
                to={n.to}
                variant="text"
                color="inherit"
                onMouseEnter={() => setOpenKey(null)}
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
