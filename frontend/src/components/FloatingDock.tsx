import AutoAwesome from "@mui/icons-material/AutoAwesome";
import CalculateOutlined from "@mui/icons-material/CalculateOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
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
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { can } from "@esti/contracts";
import { useAuth } from "../lib/auth.js";
import { trpc } from "../lib/trpc.js";
import { AlertsBell } from "./AlertsBell.js";
import { FloatingCalculator } from "./FloatingCalculator.js";
import { HeaderPomodoro } from "./HeaderPomodoro.js";
import { useOfficeHealth } from "./shell/useOfficeHealth.js";

/**
 * Floating glass dock — bottom-centred floating bar with a top border that signals
 * alert status (office health). Left→right: Studio Intelligence · quick actions ·
 * pomodoro · calculator · settings · notifications · ESTI AI. Due dates + the
 * office-health indicator live in the footer now. Square icons, liquid glass.
 */
export function FloatingDock() {
  const navigate = useNavigate();
  const [showCalc, setShowCalc] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null);
  const calcTriggerRef = useRef<HTMLButtonElement>(null);

  const { state } = useOfficeHealth();

  const borderToken =
    state === "critical"
      ? "var(--cds-support-error)"
      : state === "watch"
      ? "var(--cds-support-warning)"
      : "var(--cds-support-success)";

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
          {/* Studio Intelligence — home dashboard lives on the dock now */}
          <Tooltip title="Studio Intelligence">
            <IconButton size="small" onClick={() => navigate("/")} aria-label="Studio Intelligence" color="primary">
              <AutoAwesome />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem />

          {/* Tasks */}
          <Tooltip title="Tasks">
            <IconButton size="small" onClick={() => navigate("/tasks")} aria-label="Tasks">
              <TaskAltOutlined />
            </IconButton>
          </Tooltip>
          <HeaderPomodoro />
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

          {/* Notifications */}
          <AlertsBell />

          <Divider orientation="vertical" flexItem />

          {/* ESTI AI agent — ESTI mark */}
          <Tooltip title="Ask ESTI">
            <IconButton
              size="small"
              onClick={() => navigate("/office/ai-studio")}
              aria-label="Ask ESTI AI"
            >
              <img src="/esti-mark-white.png" alt="ESTI" style={{ height: 20 }} />
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
