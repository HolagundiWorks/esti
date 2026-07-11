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
 * Top navigation — firm name (h1) + section buttons. Menus open on hover
 * (pointer) or click / Enter / Space / ArrowDown (keyboard). Focus management
 * is enabled for keyboard/click opens (WCAG 2.1.1).
 */
export type RibbonLink = { label: string; to: string; icon?: ComponentType<any> };
export type RibbonNode =
  | (RibbonLink & { kind?: "link" })
  | { kind: "menu"; label: string; icon?: ComponentType<any>; items: RibbonNode[] };

type AdminGroup = { heading: string; items: { label: string; to: string; icon?: ComponentType<any> }[] };

const HOVER_CLOSE_MS = 120;

/** Persistent chrome hit target — WCAG 2.5.8 / Fitts. */
const chromeIconSx = { width: 44, height: 44 };

function leaves(node: RibbonNode): RibbonLink[] {
  return "items" in node ? node.items.flatMap(leaves) : [node];
}

function pathActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

const navSx = (active: boolean) => ({
  textTransform: "none",
  minHeight: 44,
  minWidth: 44,
  px: 1.5,
  borderRadius: 0,
  color: active ? "text.primary" : "text.secondary",
  borderBottom: "2px solid",
  borderBottomColor: active ? "primary.main" : "transparent",
  "&:hover": {
    backgroundColor: "transparent",
    borderBottomColor: active ? "primary.main" : "divider",
  },
});

type OpenMode = "hover" | "focus";

/** Pointer-friendly: no focus trap so hover can move into the menu. */
const hoverMenuExtras = (onEnter: () => void, onLeave: () => void) => ({
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

/** Keyboard/click: restore focus management so Arrow keys and Escape work. */
const focusMenuExtras = (onEnter: () => void, onLeave: () => void, labelledBy: string) => ({
  hideBackdrop: true,
  disableAutoFocus: false,
  disableEnforceFocus: false,
  disableRestoreFocus: false,
  disableScrollLock: true,
  sx: { pointerEvents: "none" as const },
  slotProps: {
    paper: {
      onMouseEnter: onEnter,
      onMouseLeave: onLeave,
      sx: { pointerEvents: "auto", mt: 0.25, minWidth: 180 },
    },
    list: {
      sx: { py: 0.5 },
      "aria-labelledby": labelledBy,
      autoFocusItem: true,
    },
  },
});

function useRibbonMenu() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<OpenMode>("hover");
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const scheduleClose = useCallback(() => {
    // Only auto-close hover menus; focus menus close via Escape / item click / toggle.
    if (mode === "focus") return;
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenId(null), HOVER_CLOSE_MS);
  }, [cancelClose, mode]);

  const openHover = useCallback((id: string) => {
    cancelClose();
    setMode("hover");
    setOpenId(id);
  }, [cancelClose]);

  const toggleFocus = useCallback((id: string) => {
    cancelClose();
    setOpenId((prev) => {
      if (prev === id) {
        setMode("hover");
        return null;
      }
      setMode("focus");
      return id;
    });
  }, [cancelClose]);

  const closeMenu = useCallback(() => {
    cancelClose();
    setOpenId(null);
    setMode("hover");
  }, [cancelClose]);

  return { openId, mode, openHover, toggleFocus, closeMenu, cancelClose, scheduleClose };
}

function RibbonMenu({
  menuId,
  openId,
  mode,
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
  mode: OpenMode;
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
  const open = openId === menuId && Boolean(anchorEl);
  const labelledBy = `ribbon-trigger-${menuId}`;
  const extras =
    mode === "focus"
      ? focusMenuExtras(onMenuEnter, onMenuLeave, labelledBy)
      : hoverMenuExtras(onMenuEnter, onMenuLeave);

  return (
    <Box
      component="span"
      sx={{ display: "inline-flex", verticalAlign: "middle" }}
      onMouseEnter={onTriggerEnter}
      onMouseLeave={onTriggerLeave}
    >
      {trigger}
      <Menu
        id={`ribbon-menu-${menuId}`}
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        anchorOrigin={anchorOrigin}
        transformOrigin={transformOrigin}
        {...extras}
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
  mode,
  openHover,
  toggleFocus,
  closeMenu,
  cancelClose,
  scheduleClose,
}: {
  node: Extract<RibbonNode, { kind: "menu" }>;
  menuId: string;
  openId: string | null;
  mode: OpenMode;
  openHover: (id: string) => void;
  toggleFocus: (id: string) => void;
  closeMenu: () => void;
  cancelClose: () => void;
  scheduleClose: () => void;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const btnRef = useRef<HTMLButtonElement>(null);
  const items = leaves(node);
  const active = items.some((l) => pathActive(pathname, l.to));
  const go = (to: string) => {
    closeMenu();
    navigate(to);
  };
  const isOpen = openId === menuId;

  return (
    <RibbonMenu
      menuId={menuId}
      openId={openId}
      mode={mode}
      anchorEl={btnRef.current}
      onTriggerEnter={() => openHover(menuId)}
      onTriggerLeave={scheduleClose}
      onMenuEnter={cancelClose}
      onMenuLeave={scheduleClose}
      onClose={closeMenu}
      trigger={(
        <Button
          id={`ribbon-trigger-${menuId}`}
          ref={btnRef}
          variant="text"
          color="inherit"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? `ribbon-menu-${menuId}` : undefined}
          onClick={() => toggleFocus(menuId)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!isOpen) toggleFocus(menuId);
            }
          }}
          sx={navSx(active)}
        >
          {node.label}
        </Button>
      )}
    >
      {node.items.some((c) => "items" in c)
        ? // Grouped menu (Hick/Miller): nested menu nodes render as labelled
          // ListSubheader groups — same pattern as AdminMenu.
          node.items.flatMap((child, gi) => {
            if (!("items" in child)) {
              return [
                <MenuItem
                  key={child.to}
                  selected={pathActive(pathname, child.to)}
                  onClick={() => go(child.to)}
                >
                  {child.label}
                </MenuItem>,
              ];
            }
            const ls = leaves(child);
            return [
              ...(gi > 0 ? [<Divider key={`d-${child.label}`} />] : []),
              <ListSubheader
                key={`h-${child.label}`}
                disableSticky
                sx={{ bgcolor: "transparent", lineHeight: 2.2 }}
              >
                {child.label}
              </ListSubheader>,
              ...ls.map((it, ii) => (
                <MenuItem
                  key={it.to}
                  selected={pathActive(pathname, it.to)}
                  onClick={() => go(it.to)}
                  sx={{
                    borderBottom: ii < ls.length - 1 ? 1 : 0,
                    borderColor: "divider",
                  }}
                >
                  {it.label}
                </MenuItem>
              )),
            ];
          })
        : items.map((it, i) => (
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
    </RibbonMenu>
  );
}

function AdminMenu({
  groups,
  menuId,
  openId,
  mode,
  openHover,
  toggleFocus,
  closeMenu,
  cancelClose,
  scheduleClose,
}: {
  groups: AdminGroup[];
  menuId: string;
  openId: string | null;
  mode: OpenMode;
  openHover: (id: string) => void;
  toggleFocus: (id: string) => void;
  closeMenu: () => void;
  cancelClose: () => void;
  scheduleClose: () => void;
}) {
  const navigate = useNavigate();
  const btnRef = useRef<HTMLButtonElement>(null);
  const go = (to: string) => {
    closeMenu();
    navigate(to);
  };
  const isOpen = openId === menuId;

  if (groups.length === 0) return null;

  return (
    <RibbonMenu
      menuId={menuId}
      openId={openId}
      mode={mode}
      anchorEl={btnRef.current}
      onTriggerEnter={() => openHover(menuId)}
      onTriggerLeave={scheduleClose}
      onMenuEnter={cancelClose}
      onMenuLeave={scheduleClose}
      onClose={closeMenu}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      trigger={(
        <Tooltip title="Admin · Library · Third Parties" disableHoverListener={isOpen}>
          <IconButton
            id={`ribbon-trigger-${menuId}`}
            ref={btnRef}
            aria-label="Admin menu"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-controls={isOpen ? `ribbon-menu-${menuId}` : undefined}
            onClick={() => toggleFocus(menuId)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!isOpen) toggleFocus(menuId);
              }
            }}
            sx={{ ml: 0.5, ...chromeIconSx }}
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
    </RibbonMenu>
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
  const { openId, mode, openHover, toggleFocus, closeMenu, cancelClose, scheduleClose } =
    useRibbonMenu();
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
                mode={mode}
                openHover={openHover}
                toggleFocus={toggleFocus}
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
                aria-current={pathActive(pathname, n.to) ? "page" : undefined}
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
            mode={mode}
            openHover={openHover}
            toggleFocus={toggleFocus}
            closeMenu={closeMenu}
            cancelClose={cancelClose}
            scheduleClose={scheduleClose}
          />
        </Stack>
      </Box>
    </Box>
  );
}
