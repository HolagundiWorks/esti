import {
  Column,
  Grid,
  InlineLoading,
  InlineNotification,
  Stack,
  Tile,
  Toggle,
} from "@carbon/react";
import {
  Application,
  Building,
  ChartBar,
  Construction,
  Finance,
  Settings as SettingsIcon,
  Task,
  UserAdmin,
  UserMultiple,
  type CarbonIconType,
} from "@carbon/icons-react";
import { PageHeader } from "../components/PageHeader.js";
import { trpc } from "../lib/trpc.js";
import { useAuth } from "../lib/auth.js";
import { Navigate } from "react-router-dom";

type ModuleTileProps = {
  icon: CarbonIconType;
  title: string;
  description: string;
  enabled: boolean;
  loading: boolean;
  onToggle: (checked: boolean) => void;
};

function ModuleTile({ icon: Icon, title, description, enabled, loading, onToggle }: ModuleTileProps) {
  return (
    <Tile>
      <Stack gap={4}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Stack gap={3}>
            <Icon size={24} />
            <h4>{title}</h4>
          </Stack>
          <Toggle
            id={`module-${title.toLowerCase().replace(/\s+/g, "-")}`}
            labelA="Off"
            labelB="On"
            toggled={enabled}
            disabled={loading}
            onToggle={onToggle}
            hideLabel
            size="sm"
          />
        </div>
        <p className="esti-label esti-label--secondary">{description}</p>
        {loading && <InlineLoading description="Updating…" />}
      </Stack>
    </Tile>
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

  const setHr = trpc.settings.setHrEnabled.useMutation({ onSuccess: invalidate });
  const setPmc = trpc.settings.setPmcEnabled.useMutation({ onSuccess: invalidate });
  const setModule = trpc.settings.setModuleEnabled.useMutation({ onSuccess: invalidate });

  if (settingsQ.isLoading) return <InlineLoading description="Loading modules…" />;
  if (!s) return null;

  const modules: ModuleTileProps[] = [
    {
      icon: UserMultiple,
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
      icon: Finance,
      title: "Financial Operations",
      description: "Cash book, office expense tracking, reconciliation, and vendor financial management. Disable only for practices that handle accounting outside ESTI.",
      enabled: s.financialEnabled ?? true,
      loading: setModule.isPending,
      onToggle: (checked) => setModule.mutate({ module: "financial", enabled: checked }),
    },
    {
      icon: Building,
      title: "Project Operations",
      description: "Full project lifecycle management — phases, billing milestones, drawings, and document control. Core module; disable only during trial or demo reset.",
      enabled: s.projectEnabled ?? true,
      loading: setModule.isPending,
      onToggle: (checked) => setModule.mutate({ module: "project", enabled: checked }),
    },
    {
      icon: ChartBar,
      title: "Admin & Governance",
      description: "Audit log, archived projects, and administrative oversight tools. Keep enabled for all production installations.",
      enabled: s.adminEnabled ?? true,
      loading: setModule.isPending,
      onToggle: (checked) => setModule.mutate({ module: "admin", enabled: checked }),
    },
    {
      icon: Application,
      title: "AI Studio",
      description: "ESTI AI agent, billing assistant, and generative drafting tools. Uses firm Ollama instance or per-user cloud API keys. Disable if AI connectivity is not available.",
      enabled: true,
      loading: false,
      onToggle: () => undefined,
    },
    {
      icon: Task,
      title: "Knowledge Bank",
      description: "DSR rate reference, RIE compliance engine, spec catalogue, SteelFlow BBS, and bylaw calculator. Core reference module — always enabled.",
      enabled: true,
      loading: false,
      onToggle: () => undefined,
    },
    {
      icon: UserAdmin,
      title: "Client & Collaborator Portals",
      description: "External stakeholder portals: client change requests and approvals, collaborator (consultant) scoped access. Enabled automatically when portals are provisioned.",
      enabled: true,
      loading: false,
      onToggle: () => undefined,
    },
    {
      icon: SettingsIcon,
      title: "Contractor Bid Portal",
      description: "Magic-link bid submission for contractors. Active as long as at least one tender has an open bid round.",
      enabled: true,
      loading: false,
      onToggle: () => undefined,
    },
  ];

  return (
    <Stack gap={7}>
      <PageHeader
        title="System administration"
        description="Installation-level controls: module toggles and data management. Visible only to system administrators."
      />

      {(setHr.error || setPmc.error || setModule.error) && (
        <InlineNotification
          kind="error"
          title="Could not update module"
          subtitle={(setHr.error ?? setPmc.error ?? setModule.error)?.message}
          hideCloseButton
          lowContrast
        />
      )}

      <Stack gap={3}>
        <h3>Modules</h3>
        <p className="esti-label esti-label--secondary">
          Toggle switches control which modules appear in the navigation for all staff. Modules marked as always-on are core to ESTI and cannot be disabled from this interface.
        </p>
      </Stack>

      <Grid narrow>
        {modules.map((m) => (
          <Column key={m.title} lg={4} md={4} sm={4}>
            <ModuleTile {...m} />
          </Column>
        ))}
      </Grid>

      <Stack gap={3}>
        <h3>Data management</h3>
        <p className="esti-label esti-label--secondary">
          Import demo data and purge operations are available on the Company settings page (Admin → Company) for system administrators only.
        </p>
      </Stack>
    </Stack>
  );
}
