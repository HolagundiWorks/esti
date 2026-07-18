import {
  Alert,
  Box,
  CircularProgress,
  Grid,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import Apps from "@mui/icons-material/Apps";
import Business from "@mui/icons-material/Business";
import BarChart from "@mui/icons-material/BarChart";
import Construction from "@mui/icons-material/Construction";
import AccountBalance from "@mui/icons-material/AccountBalance";
import Settings from "@mui/icons-material/Settings";
import Task from "@mui/icons-material/Task";
import ManageAccounts from "@mui/icons-material/ManageAccounts";
import Group from "@mui/icons-material/Group";
import { DataState } from "../components/DataState.js";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { trpc } from "../lib/trpc.js";
import { useAuth } from "../lib/auth.js";
import { Navigate } from "react-router-dom";
import { AORMS_PORTALS, AORMS_STUDIO, externalPortalsPhrase } from "../lib/product-nomenclature.js";

type ModuleTileProps = {
  icon: SvgIconComponent;
  title: string;
  description: string;
  enabled: boolean;
  loading: boolean;
  onToggle: (checked: boolean) => void;
};

function ModuleTile({ icon: Icon, title, description, enabled, loading, onToggle }: ModuleTileProps) {
  return (
    <Box sx={{ p: 2, height: 1, borderBottom: 1, borderColor: "divider" }}>
      <Stack spacing={2}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Stack spacing={1.5}>
            <Icon />
            <Typography variant="h6" component="h4">{title}</Typography>
          </Stack>
          <Switch
            id={`module-${title.toLowerCase().replace(/\s+/g, "-")}`}
            checked={enabled}
            disabled={loading}
            onChange={(e) => onToggle(e.target.checked)}
            size="small"
            slotProps={{ input: { "aria-label": `${title} enabled` } }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">{description}</Typography>
        {loading && (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">Updating…</Typography>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

export function SystemAdmin() {
  const { user } = useAuth();

  // Only system admins may access this page
  if (!user?.isSystemAdmin) {
    return <Navigate to="/" replace />;
  }

  const utils = trpc.useUtils();
  const settingsQ = trpc.settings.get.useQuery();
  const s = settingsQ.data;

  const invalidate = () => {
    utils.settings.get.invalidate();
  };

  const setHr = trpc.settings.setHrEnabled.useMutation({ meta: { errorTitle: "Couldn't update the HR setting" }, onSuccess: invalidate });
  const setPmc = trpc.settings.setPmcEnabled.useMutation({ meta: { errorTitle: "Couldn't update the PMC setting" }, onSuccess: invalidate });
  const setModule = trpc.settings.setModuleEnabled.useMutation({ meta: { errorTitle: "Couldn't update the module setting" }, onSuccess: invalidate });

  if (settingsQ.isLoading) {
    return (
      <RailLayout
        title="System administration"
        description="Installation-level controls: module toggles and data management. Visible only to system administrators."
      >
        <PageBreadcrumb items={[{ label: "Admin" }, { label: "System" }]} />
        <DataState loading isEmpty={false} empty={{ title: "" }} columnCount={3}>
          {null}
        </DataState>
      </RailLayout>
    );
  }
  if (!s) return null;

  const modules: ModuleTileProps[] = [
    {
      icon: Group,
      title: "Team & HR",
      description: "Staff roster, attendance tracking, leave management, payroll processing, and ASPRF performance scoring. Team mode is the default operating model.",
      enabled: s.hrEnabled,
      loading: setHr.isPending,
      onToggle: (checked) => setHr.mutate({ hrEnabled: checked }),
    },
    {
      icon: Construction,
      title: "PMC / Construction",
      description: "Site coordination hub, RFI / submittal / NCR tracking, construction schedules (CPM/Gantt), and progress reporting. Enable when the firm has active construction-stage commissions.",
      enabled: s.pmcEnabled,
      loading: setPmc.isPending,
      onToggle: (checked) => setPmc.mutate({ pmcEnabled: checked }),
    },
    {
      icon: AccountBalance,
      title: "Financial Operations",
      description: "Cash book, office expense tracking, reconciliation, and vendor financial management. Disable only for practices that handle accounting outside ESTI.",
      enabled: s.financialEnabled ?? true,
      loading: setModule.isPending,
      onToggle: (checked) => setModule.mutate({ module: "financial", enabled: checked }),
    },
    {
      icon: Business,
      title: "Project Operations",
      description: "Full project lifecycle management — phases, billing milestones, drawings, and document control. Core module; disable only during trial or demo reset.",
      enabled: s.projectEnabled ?? true,
      loading: setModule.isPending,
      onToggle: (checked) => setModule.mutate({ module: "project", enabled: checked }),
    },
    {
      icon: BarChart,
      title: "Admin & Governance",
      description: "Audit log, archived projects, and administrative oversight tools. Keep enabled for all production installations.",
      enabled: s.adminEnabled ?? true,
      loading: setModule.isPending,
      onToggle: (checked) => setModule.mutate({ module: "admin", enabled: checked }),
    },
    {
      icon: Apps,
      title: "AI Studio",
      description: "ESTI AI agent, billing assistant, and generative drafting tools. Uses firm Ollama instance or per-user cloud API keys. Disable if AI connectivity is not available.",
      enabled: true,
      loading: false,
      onToggle: () => undefined,
    },
    {
      icon: Task,
      title: "Knowledge Bank",
      description: "Rate books, rate analysis, components, specification catalogue, parametric studies, and lessons. Core reference module — always enabled.",
      enabled: true,
      loading: false,
      onToggle: () => undefined,
    },
    {
      icon: ManageAccounts,
      title: `${AORMS_STUDIO.title} · external portals`,
      description: `${externalPortalsPhrase()}: client change requests and approvals, ${AORMS_PORTALS.consultant.label.toLowerCase()} scoped access, contractor and site surfaces. Enabled when portal logins are provisioned.`,
      enabled: true,
      loading: false,
      onToggle: () => undefined,
    },
    {
      icon: Settings,
      title: "Contractor Bid Portal",
      description: "Magic-link bid submission for contractors. Active as long as at least one tender has an open bid round.",
      enabled: true,
      loading: false,
      onToggle: () => undefined,
    },
  ];

  return (
    <RailLayout
      title="System administration"
      description="Installation-level controls: module toggles and data management. Visible only to system administrators."
    >
      <PageBreadcrumb items={[{ label: "Admin" }, { label: "System" }]} />
      {(setHr.error || setPmc.error || setModule.error) && (
        <Alert severity="error">
          <strong>Could not update module</strong>
          {" — "}
          {(setHr.error ?? setPmc.error ?? setModule.error)?.message}
        </Alert>
      )}

      <Stack spacing={1.5}>
        <Typography variant="h6" component="h3">Modules</Typography>
        <Typography variant="body2" color="text.secondary">
          Toggle switches control which modules appear in the navigation for all staff. Modules marked as always-on are core to ESTI and cannot be disabled from this interface.
        </Typography>
      </Stack>

      <Grid container spacing={2}>
        {modules.map((m) => (
          <Grid key={m.title} size={{ xs: 12, sm: 6, lg: 3 }}>
            <ModuleTile {...m} />
          </Grid>
        ))}
      </Grid>

      <Stack spacing={1.5}>
        <Typography variant="h6" component="h3">Data management</Typography>
        <Typography variant="body2" color="text.secondary">
          Import demo data and purge operations are available on the Company settings page (Admin → Company) for system administrators only.
        </Typography>
      </Stack>
    </RailLayout>
  );
}
