import AddBoxOutlined from "@mui/icons-material/AddBoxOutlined";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import CalculateOutlined from "@mui/icons-material/CalculateOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import {
  Divider,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { can } from "@esti/contracts";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { FloatingCalculator } from "./FloatingCalculator.js";
import { OfficeHealthGlyph } from "./shell/OfficeHealthGlyph.js";
import type { ZoneState } from "./dashboard/zoneState.js";

/**
 * Floating glass dock — bottom-centred floating bar (height = top nav bar) with a
 * top border that signals alert status (due dates + office health). Left→right:
 * due dates · office-health glyph (shape only) · quick actions · ESTI AI. Square
 * icons, liquid glass (Paper). Calculator (Alt+C) + admin module toggles are kept
 * as quick actions.
 */
export function FloatingDock() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCalc, setShowCalc] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null);
  const calcTriggerRef = useRef<HTMLButtonElement>(null);

  const homeQ = trpc.dashboard.home.useQuery(undefined, { staleTime: 60_000 });
  const glanceQ = trpc.dashboard.todayGlance.useQuery(undefined, { staleTime: 60_000 });

  const home = homeQ.data;
  const risk = (home?.projectHealth ?? []).filter((p: { health: string }) => p.health === "RED").length;
  const overduePaise = home?.financialHealth?.overdue30dPaise ?? 0;
  const overdueInvoices = home?.actionCenter?.overdueInvoices?.length ?? 0;
  const pendingTasks = glanceQ.data?.pendingTasks ?? 0;

  const state: ZoneState = !home
    ? "inactive"
    : risk >= 2 || overduePaise > 5_000_000 || overdueInvoices >= 3
    ? "critical"
    : risk >= 1 || overduePaise > 0 || overdueInvoices > 0
    ? "watch"
    : "stable";

  const borderToken =
    state === "critical"
      ? "var(--cds-support-error)"
      : state === "watch"
      ? "var(--cds-support-warning)"
      : "var(--cds-support-success)";

  const canInvoice = can(user?.role, "invoice:manage");

  // Alt+C toggles the calculator (kept from the previous dock).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        setShowCalc((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Paper
        elevation={0}
        className="esti-floating-dock"
        sx={{ borderTop: 2, borderTopColor: borderToken, height: 48, px: 1.5 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", height: 1 }}>
          {/* Due dates */}
          <Tooltip title="Pending tasks · overdue invoices">
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ alignItems: "center", cursor: "pointer" }}
              onClick={() => navigate("/tasks")}
            >
              <AssignmentOutlined sx={{ fontSize: 18 }} />
              <Typography variant="caption">
                {pendingTasks} due{overdueInvoices > 0 ? ` · ${overdueInvoices} inv` : ""}
              </Typography>
            </Stack>
          </Tooltip>

          <Divider orientation="vertical" flexItem />

          {/* Office health — shape only */}
          <Tooltip title={`Office health: ${state}`}>
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ alignItems: "center", cursor: "pointer" }}
              onClick={() => navigate("/")}
            >
              <OfficeHealthGlyph state={state} size={14} />
              <Typography variant="caption" sx={{ textTransform: "capitalize" }}>
                {state}
              </Typography>
            </Stack>
          </Tooltip>

          <Divider orientation="vertical" flexItem />

          {/* Quick actions */}
          <Tooltip title="Projects">
            <IconButton size="small" onClick={() => navigate("/projects")} aria-label="Projects">
              <AddBoxOutlined />
            </IconButton>
          </Tooltip>
          {canInvoice && (
            <Tooltip title="Invoices">
              <IconButton size="small" onClick={() => navigate("/invoices")} aria-label="Invoices">
                <ReceiptLongOutlined />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Search">
            <IconButton size="small" onClick={() => navigate("/search")} aria-label="Search">
              <SearchOutlined />
            </IconButton>
          </Tooltip>
          <Tooltip title="Calculator (Alt+C)">
            <IconButton
              ref={calcTriggerRef}
              size="small"
              color={showCalc ? "primary" : "default"}
              onClick={() => setShowCalc((o) => !o)}
              aria-label="Calculator"
            >
              <CalculateOutlined />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton
              size="small"
              onClick={(e) => setSettingsAnchor(e.currentTarget)}
              aria-label="Settings"
            >
              <SettingsOutlined />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem />

          {/* ESTI AI agent */}
          <Tooltip title="Ask ESTI">
            <IconButton
              size="small"
              color="primary"
              onClick={() => navigate("/office/ai-studio")}
              aria-label="Ask ESTI AI"
            >
              <AutoAwesome />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      <FloatingCalculator
        open={showCalc}
        onClose={() => setShowCalc(false)}
        triggerRef={calcTriggerRef}
      />
      <SettingsMenu anchorEl={settingsAnchor} onClose={() => setSettingsAnchor(null)} />
    </>
  );
}

function SettingsMenu({
  anchorEl,
  onClose,
}: {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isAdmin = can(user?.role, "firm:admin");
  const settingsQ = trpc.settings.get.useQuery(undefined, { enabled: isAdmin });
  const showFinancial = settingsQ.data?.financialEnabled ?? true;
  const showProject = settingsQ.data?.projectEnabled ?? true;
  const setModule = trpc.settings.setModuleEnabled.useMutation({
    onSuccess: () => utils.settings.get.invalidate(),
  });

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      transformOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      {isAdmin && (
        <MenuItem disableRipple>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showFinancial}
                disabled={setModule.isPending || settingsQ.isLoading}
                onChange={(e) => setModule.mutate({ module: "financial", enabled: e.target.checked })}
              />
            }
            label="Financial"
          />
        </MenuItem>
      )}
      {isAdmin && (
        <MenuItem disableRipple>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showProject}
                disabled={setModule.isPending || settingsQ.isLoading}
                onChange={(e) => setModule.mutate({ module: "project", enabled: e.target.checked })}
              />
            }
            label="Project"
          />
        </MenuItem>
      )}
      <MenuItem component={Link} to="/settings" onClick={onClose}>
        Open my profile
      </MenuItem>
    </Menu>
  );
}
