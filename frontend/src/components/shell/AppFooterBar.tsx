import Logout from "@mui/icons-material/Logout";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import Settings from "@mui/icons-material/Settings";
import {
  Box,
  Divider,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserIdCard } from "../UserIdCard.js";
import { OfficeHealthGlyph } from "./OfficeHealthGlyph.js";
import { useOfficeHealth } from "./useOfficeHealth.js";

type AdminGroup = { heading: string; items: { label: string; to: string; icon?: ComponentType<any> }[] };

/**
 * Footer bar — no header bar; the firm name lives in the ribbon, the AORMS logo
 * floats above. Left: date + due dates. Centre: open Search. Right: office-health
 * ("stable") indicator + ID card + sign out. Notifications live on the dock now.
 * Liquid glass, compact height.
 */
function FooterClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  const date = now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return <span className="esti-header-clock">{date} · {time}</span>;
}

export function AppFooterBar({
  planClass,
  adminGroups = [],
  onSignOut,
}: {
  planClass?: string;
  adminGroups?: AdminGroup[];
  onSignOut: () => void;
}) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [adminAnchor, setAdminAnchor] = useState<null | HTMLElement>(null);
  const { state, pendingTasks, overdueInvoices } = useOfficeHealth();
  const runSearch = () => {
    const q = term.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };
  const goAdmin = (to: string) => { setAdminAnchor(null); navigate(to); };

  return (
    <Box component="footer" className={`esti-app-footer ${planClass ?? ""}`}>
      {/* Left: date + due dates */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flex: 1 }}>
        <FooterClock />
        <Tooltip title="Pending tasks · overdue invoices">
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/tasks")}
          >
            · {pendingTasks} due{overdueInvoices > 0 ? ` · ${overdueInvoices} inv` : ""}
          </Typography>
        </Tooltip>
      </Stack>

      {/* Centered open search */}
      <TextField
        className="esti-app-footer__search"
        size="small"
        variant="standard"
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

      {/* Right: office-health indicator + ID card + sign out */}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flex: 1, justifyContent: "flex-end" }}>
        <Tooltip title={`Office health: ${state}`}>
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ alignItems: "center", cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            <OfficeHealthGlyph state={state} size={12} />
            <Typography variant="caption" sx={{ textTransform: "capitalize" }}>{state}</Typography>
          </Stack>
        </Tooltip>
        {adminGroups.length > 0 && (
          <>
            <Tooltip title="Admin · Library · Third Parties">
              <IconButton
                size="small"
                onClick={(e) => setAdminAnchor(e.currentTarget)}
                aria-label="Admin menu"
              >
                <Settings />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={adminAnchor}
              open={Boolean(adminAnchor)}
              onClose={() => setAdminAnchor(null)}
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
              transformOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
              {adminGroups.flatMap((g, gi) => [
                ...(gi > 0 ? [<Divider key={`d-${g.heading}`} />] : []),
                <ListSubheader key={`h-${g.heading}`} disableSticky sx={{ bgcolor: "transparent", lineHeight: 2.2 }}>
                  {g.heading}
                </ListSubheader>,
                ...g.items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <MenuItem key={it.to} onClick={() => goAdmin(it.to)}>
                      {Icon && <ListItemIcon><Icon fontSize="small" /></ListItemIcon>}
                      <ListItemText>{it.label}</ListItemText>
                    </MenuItem>
                  );
                }),
              ])}
            </Menu>
          </>
        )}
        <UserIdCard />
        <Tooltip title="Sign out">
          <IconButton size="small" onClick={onSignOut} aria-label="Sign out">
            <Logout />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
