import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  LinearProgress,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { ORG_MODE_LABEL } from "@esti/contracts";
import { useEffect, useState } from "react";
import SaveIcon from "@mui/icons-material/Save";
import { AiStudioSettingsPanel } from "./AiStudioSettingsPanel.js";
import { LicensePanel } from "./LicensePanel.js";
import { MigrationPanel } from "./MigrationPanel.js";
import { StorageSettingsPanel } from "./StorageSettingsPanel.js";
import { DataTools } from "./DataTools.js";
import { EscalationSettingsPanel } from "./EscalationSettingsPanel.js";
import { ReleaseMetadataPanel } from "./ReleaseMetadataPanel.js";
import { UploadSecurityPanel } from "./UploadSecurityPanel.js";
import { useAuth } from "../../lib/auth.js";
import { useCapabilities } from "../../lib/capabilities.js";
import { trpc } from "../../lib/trpc.js";

/** Workspace office administration — licence, storage, AI, HR toggles (company account portal). */
export function CompanyAdminPanel() {
  const { user } = useAuth();
  const { canFirmAdmin } = useCapabilities();
  const isOwner = canFirmAdmin;
  const utils = trpc.useUtils();
  const settingsQ = trpc.settings.get.useQuery();
  const hrStatusQ = trpc.settings.hrModuleStatus.useQuery();

  const setPmc = trpc.settings.setPmcEnabled.useMutation({
    meta: { errorTitle: "Couldn't update the PMC module setting" },
    onSuccess: () => {
      utils.settings.get.invalidate();
      setMsg("PMC module setting updated.");
    },
  });

  const setWellness = trpc.settings.setWellness.useMutation({
    meta: { errorTitle: "Couldn't update the break schedule" },
    onSuccess: () => {
      utils.settings.get.invalidate();
      setMsg("Break schedule updated.");
    },
  });
  const wellness = (settingsQ.data as { wellness?: { snackBreak: string | null; lunchBreak: string | null } } | undefined)?.wellness;
  const [snackBreak, setSnackBreak] = useState("");
  const [lunchBreak, setLunchBreak] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    setSnackBreak(wellness?.snackBreak ?? "");
    setLunchBreak(wellness?.lunchBreak ?? "");
  }, [wellness?.snackBreak, wellness?.lunchBreak]);

  const used = (user as { storageUsedBytes?: number } | null)?.storageUsedBytes ?? 0;
  const quota = (user as { storageQuotaBytes?: number } | null)?.storageQuotaBytes ?? 5 * 1024 ** 3;
  const pct = Math.min(100, (used / quota) * 100);
  const fmt = (b: number) =>
    b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : `${(b / 1024 ** 2).toFixed(0)} MB`;

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="h6" component="h2" className="esti-grow">
            Office administration
          </Typography>
          {isOwner && (
            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon />}
              disabled={setWellness.isPending}
              onClick={() =>
                setWellness.mutate({
                  snackBreak: snackBreak || null,
                  lunchBreak: lunchBreak || null,
                })
              }
            >
              {setWellness.isPending ? "Saving…" : "Save breaks"}
            </Button>
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Workspace settings — licence, storage, AI, and office modules.
        </Typography>

        {msg && (
          <Alert severity="success" onClose={() => setMsg(null)}>
            {msg}
          </Alert>
        )}

        <Box className="esti-form-panel--wide">
          <Stack spacing={2}>
            <Typography variant="subtitle1" component="h3">
              Team &amp; HR module
            </Typography>
            <Typography variant="body2">
              Operating mode for your office:{" "}
              <strong>{ORG_MODE_LABEL[(settingsQ.data?.orgMode as "SOLO" | "STUDIO") ?? "STUDIO"]}</strong>.
              Team mode is always active and includes roster, assignments, attendance, workload visibility,
              and ASPRF.
            </Typography>
            <Alert severity="success" icon={false}>
              <strong>Team mode active</strong> — The workspace runs with team navigation, workload, HR,
              attendance and performance modules enabled.
            </Alert>
            {hrStatusQ.data?.archives && hrStatusQ.data.archives.length > 0 && (
              <Stack spacing={1}>
                <Typography variant="subtitle1" component="h4">
                  Archive history
                </Typography>
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date / Reason</TableCell>
                        <TableCell>Summary</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {hrStatusQ.data.archives.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            {new Date(a.createdAt).toLocaleString("en-IN")}
                            {a.reason ? ` — ${a.reason}` : ""}
                          </TableCell>
                          <TableCell>
                            {a.tasksRemapped} tasks · {a.membersArchived} members
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Stack>
            )}
          </Stack>
        </Box>

        <Box className="esti-form-panel--wide">
          <Stack spacing={2}>
            <Typography variant="subtitle1" component="h3">
              PMC module
            </Typography>
            <Typography variant="body2">
              Project management for site coordination — construction inbox, snag register, site
              instructions, and monthly progress reports. Enable per project in Project settings.
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  id="pmc-toggle"
                  checked={settingsQ.data?.pmcEnabled ?? false}
                  disabled={!isOwner || setPmc.isPending || settingsQ.isLoading}
                  onChange={(e) => setPmc.mutate({ pmcEnabled: e.target.checked })}
                />
              }
              label="Enable PMC module"
            />
            {!isOwner && <Typography variant="body2">Only the owner can change this.</Typography>}
          </Stack>
        </Box>

        <Box>
          <Stack spacing={2}>
            <Typography variant="subtitle1" component="h3">
              Wellbeing &amp; breaks
            </Typography>
            <Typography variant="body2">
              Office snack and lunch break times — everyone gets a gentle reminder at these times.
              Personal hydration reminders are toggled per person from the Wellness dock.
            </Typography>
            <Stack direction="row" spacing={2}>
              <TextField
                id="snack-break"
                type="time"
                label="Snack break"
                value={snackBreak}
                onChange={(e) => setSnackBreak(e.target.value)}
                disabled={!isOwner}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ maxWidth: 180 }}
              />
              <TextField
                id="lunch-break"
                type="time"
                label="Lunch break"
                value={lunchBreak}
                onChange={(e) => setLunchBreak(e.target.value)}
                disabled={!isOwner}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ maxWidth: 180 }}
              />
            </Stack>
            {!isOwner && <Typography variant="body2">Only the owner can change this.</Typography>}
          </Stack>
        </Box>

        <Box>
          <Typography variant="overline" color="text.secondary">
            Storage
          </Typography>
          <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="body2">{fmt(used)} used</Typography>
            <Typography variant="body2" color="text.secondary">
              {fmt(quota)} quota
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={pct}
            color={pct > 90 ? "error" : pct > 70 ? "warning" : "primary"}
            sx={{ height: 6 }}
          />
          {pct > 85 && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
              Storage almost full — archive closed projects or contact support to add more.
            </Typography>
          )}
        </Box>

        {isOwner && <LicensePanel />}
        {isOwner && <MigrationPanel />}
        {isOwner && <EscalationSettingsPanel />}
        {isOwner && <UploadSecurityPanel />}
        {isOwner && !user?.isDemo && <AiStudioSettingsPanel />}
        {isOwner && <StorageSettingsPanel />}
        {isOwner && <ReleaseMetadataPanel />}
        {isOwner && <DataTools />}
      </Stack>
    </Box>
  );
}
