import SearchOutlined from "@mui/icons-material/SearchOutlined";
import { Box, Button, InputAdornment, Stack, Tab, Tabs, TextField } from "@mui/material";
import { useEffect, useState, type ComponentType } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

/**
 * Top ribbon navigation — Excel/Office-style. Replaces the left side-nav.
 *   Header strip: centered open search · AORMS brand (top-right).
 *   Row 1: ribbon TABS (top-level sections).
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

export function AppRibbon({
  nav,
  plan,
  logoSrc,
}: {
  nav: RibbonNode[];
  plan: string;
  logoSrc: string;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [term, setTerm] = useState("");

  const activeTop = Math.max(
    0,
    nav.findIndex((n) => leaves(n).some((l) => pathActive(pathname, l.to))),
  );
  const [selected, setSelected] = useState(activeTop);
  useEffect(() => setSelected(activeTop), [activeTop]);

  const current = nav[selected];
  const commands = current ? leaves(current) : [];

  const runSearch = () => {
    const q = term.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  return (
    <Box className="esti-ribbon">
      {/* Header strip: centered open search · brand top-right */}
      <Box className="esti-ribbon__top">
        <Box sx={{ flex: 1 }} />
        <TextField
          className="esti-ribbon__search"
          size="small"
          placeholder="Search AORMS…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Box sx={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
          <span className="esti-app-brand">
            <img src={logoSrc} alt="AORMS" className="esti-app-brand__logo" />
            <span className="esti-app-brand__tier">{plan}</span>
          </span>
        </Box>
      </Box>

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
