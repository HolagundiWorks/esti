import MenuOutlined from "@mui/icons-material/MenuOutlined";
import {
  Box,
  Button,
  Divider,
  IconButton,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
} from "@mui/material";
import { useCallback, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

/**
 * Top navigation — firm name (h1) + section buttons. Plain links navigate
 * directly; sections with children open a hover dropdown (same interaction as
 * the admin menu). Text-only items, hairline separators.
 */
export type RibbonLink = { label: string; to: string; icon?: ComponentType<any> };
export type RibbonNode =
  | (RibbonLink & { kind?: "link" })
  | { kind: "menu"; label: string; icon?: ComponentType<any>; items: RibbonNode[] };

type AdminGroup = { heading: string; items: { label: string; to: string; icon?: ComponentType<any> }[] };

const HOVER_CLOSE_MS = 120;

function leaves(node: RibbonNode): RibbonLink[] {
  return "items" in node ? node.items.flatMap(leaves) : [node];
}

function pathActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

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

const ribbonMenuSlotProps = (onEnter: () => void, onLeave: () => void) => ({
  hideBackdrop: true,
  disableAutoFocus: true,
  disableEnforceFocus: true,
  disableRestoreFocus: true,
  disableScrollLock: true,
  sx: { pointerEvents: "none" as const },
  slotProps: {
    paper: {
      onMouseEnter: onEnter,
      onMouseLeave: onLeave,
      sx: { pointerEvents: "auto", mt: 0.25, minWidth: 180 },
    },
    list: { sx: { py: 0.5 } },
  },
});

function useRibbonHoverMenu() {
  const [openId, setOpenId] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenId(null), HOVER_CLOSE_MS);
  }, [cancelClose]);

  const openMenu = useCallback((id: string) => {
    cancelClose();
    setOpenId(id);
  }, [cancelClose]);

  const closeMenu = useCallback(() => {
    cancelClose();
    setOpenId(null);
  }, [cancelClose]);

  return { openId, openMenu, closeMenu, cancelClose, scheduleClose };
}

function RibbonHoverMenu({
  menuId,
  openId,
  anchorEl,
  onTriggerEnter,
  onTriggerLeave,
  onMenuEnter,
  onMenuLeave,
  onClose,
  anchorOrigin = { vertical: "bottom", horizontal: "left" },
  transformOrigin = { vertical: "top", horizontal: "left" },
  trigger,
  children,
}: {
  menuId: string;
  openId: string | null;
  anchorEl: HTMLElement | null;
  onTriggerEnter: () => void;
  onTriggerLeave: () => void;
  onMenuEnter: () => void;
  onMenuLeave: () => void;
  onClose: () => void;
  anchorOrigin?: { vertical: "bottom" | "top" | "center"; horizontal: "left" | "right" | "center" };
  transformOrigin?: { vertical: "bottom" | "top" | "center"; horizontal: "left" | "right" | "center" };
  trigger: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box
      component="span"
      sx={{ display: "inline-flex", verticalAlign: "middle" }}
      onMouseEnter={onTriggerEnter}
      onMouseLeave={onTriggerLeave}
    >
      {trigger}
      <Menu
        anchorEl={anchorEl}
        open={openId === menuId && Boolean(anchorEl)}
        onClose={onClose}
        anchorOrigin={anchorOrigin}
        transformOrigin={transformOrigin}
        {...ribbonMenuSlotProps(onMenuEnter, onMenuLeave)}
      >
        {children}
      </Menu>
    </Box>
  );
}

function SectionMenu({
  node,
  menuId,
  openId,
  openMenu,
  closeMenu,
  cancelClose,
  scheduleClose,
}: {
  node: Extract<RibbonNode, { kind: "menu" }>;
  menuId: string;
  openId: string | null;
  openMenu: (id: string) => void;
  closeMenu: () => void;
  cancelClose: () => void;
  scheduleClose: () => void;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const btnRef = useRef<HTMLButtonElement>(null);
  const items = leaves(node);
  const active = items.some((l) => pathActive(pathname, l.to));
  const go = (to: string) => { closeMenu(); navigate(to); };

  return (
    <RibbonHoverMenu
      menuId={menuId}
      openId={openId}
      anchorEl={btnRef.current}
      onTriggerEnter={() => openMenu(menuId)}
      onTriggerLeave={scheduleClose}
      onMenuEnter={cancelClose}
      onMenuLeave={scheduleClose}
      onClose={closeMenu}
      trigger={(
        <Button
          ref={btnRef}
          variant="text"
          color="inherit"
          aria-haspopup="menu"
          aria-expanded={openId === menuId}
          sx={navSx(active)}
        >
          {node.label}
        </Button>
      )}
    >
      {items.map((it, i) => (
        <MenuItem
          key={it.to}
          selected={pathActive(pathname, it.to)}
          onClick={() => go(it.to)}
          sx={{
            borderBottom: i < items.length - 1 ? 1 : 0,
            borderColor: "divider",
          }}
        >
          {it.label}
        </MenuItem>
      ))}
    </RibbonHoverMenu>
  );
}

function AdminMenu({
  groups,
  menuId,
  openId,
  openMenu,
  closeMenu,
  cancelClose,
  scheduleClose,
}: {
  groups: AdminGroup[];
  menuId: string;
  openId: string | null;
  openMenu: (id: string) => void;
  closeMenu: () => void;
  cancelClose: () => void;
  scheduleClose: () => void;
}) {
  const navigate = useNavigate();
  const btnRef = useRef<HTMLButtonElement>(null);
  const go = (to: string) => { closeMenu(); navigate(to); };

  if (groups.length === 0) return null;

  return (
    <RibbonHoverMenu
      menuId={menuId}
      openId={openId}
      anchorEl={btnRef.current}
      onTriggerEnter={() => openMenu(menuId)}
      onTriggerLeave={scheduleClose}
      onMenuEnter={cancelClose}
      onMenuLeave={scheduleClose}
      onClose={closeMenu}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      trigger={(
        <Tooltip title="Admin · Library · Third Parties" disableHoverListener={openId === menuId}>
          <IconButton
            ref={btnRef}
            size="small"
            aria-label="Admin menu"
            aria-haspopup="menu"
            aria-expanded={openId === menuId}
            sx={{ ml: 0.5 }}
          >
            <MenuOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    >
      {groups.flatMap((g, gi) => [
        ...(gi > 0 ? [<Divider key={`d-${g.heading}`} />] : []),
        <ListSubheader key={`h-${g.heading}`} disableSticky sx={{ bgcolor: "transparent", lineHeight: 2.2 }}>
          {g.heading}
        </ListSubheader>,
        ...g.items.map((it, ii) => (
          <MenuItem
            key={it.to}
            onClick={() => go(it.to)}
            sx={{
              borderBottom: ii < g.items.length - 1 ? 1 : 0,
              borderColor: "divider",
            }}
          >
            {it.label}
          </MenuItem>
        )),
      ])}
    </RibbonHoverMenu>
  );
}

const ADMIN_MENU_ID = "__admin__";

export function AppRibbon({
  nav,
  firmName,
  adminGroups = [],
  variant = "bar",
}: {
  nav: RibbonNode[];
  firmName: string;
  adminGroups?: AdminGroup[];
  /** `float` — fixed top-right overlay (Studio Intelligence home). */
  variant?: "bar" | "float";
}) {
  const { pathname } = useLocation();
  const { openId, openMenu, closeMenu, cancelClose, scheduleClose } = useRibbonHoverMenu();
  const isFloat = variant === "float";

  const closeMenus = () => {
    cancelClose();
    closeMenu();
  };

  return (
    <Box
      className={isFloat ? "esti-ribbon esti-ribbon--float" : "esti-ribbon"}
      component="nav"
      aria-label="Main navigation"
      onMouseLeave={scheduleClose}
    >
      <Box className="esti-ribbon__nav">
        {!isFloat && (
          <h1 className="esti-ribbon__title" title={firmName}>{firmName}</h1>
        )}
        {!isFloat && <Box sx={{ flex: 1 }} />}
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ alignItems: "center", flexWrap: isFloat ? "wrap" : "nowrap", justifyContent: "flex-end" }}
          onMouseEnter={cancelClose}
        >
          {nav.map((n) =>
            "items" in n ? (
              <SectionMenu
                key={n.label}
                node={n}
                menuId={n.label}
                openId={openId}
                openMenu={openMenu}
                closeMenu={closeMenu}
                cancelClose={cancelClose}
                scheduleClose={scheduleClose}
              />
            ) : (
              <Button
                key={n.label}
                component={Link}
                to={n.to}
                variant="text"
                color="inherit"
                onMouseEnter={closeMenus}
                sx={navSx(pathActive(pathname, n.to))}
              >
                {n.label}
              </Button>
            ),
          )}
          <AdminMenu
            groups={adminGroups}
            menuId={ADMIN_MENU_ID}
            openId={openId}
            openMenu={openMenu}
            closeMenu={closeMenu}
            cancelClose={cancelClose}
            scheduleClose={scheduleClose}
          />
        </Stack>
      </Box>
    </Box>
  );
}
