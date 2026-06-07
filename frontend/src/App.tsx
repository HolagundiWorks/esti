import {
  Content,
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderName,
  Loading,
  SideNav,
  SideNavItems,
  SideNavLink,
  Theme,
} from "@carbon/react";
import {
  Asleep,
  Building,
  Catalog,
  Dashboard as DashboardIcon,
  Enterprise,
  Identification,
  Light,
  Logout,
  Notification,
  Partnership,
  Settings as SettingsIcon,
  UserMultiple,
  Wallet,
  type CarbonIconType,
} from "@carbon/icons-react";
import { useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth.js";
import { trpc } from "./lib/trpc.js";
import { FloatingCalculator } from "./components/FloatingCalculator.js";
import { Alerts } from "./routes/Alerts.js";
import { Clients } from "./routes/Clients.js";
import { CollaboratorPortal } from "./routes/CollaboratorPortal.js";
import { Company } from "./routes/Company.js";
import { Consultants } from "./routes/Consultants.js";
import { Dashboard } from "./routes/Dashboard.js";
import { Login } from "./routes/Login.js";
import { MasterDsr } from "./routes/MasterDsr.js";
import { Portal } from "./routes/Portal.js";
import { ProjectDetail } from "./routes/ProjectDetail.js";
import { Projects } from "./routes/Projects.js";
import { Reconcile } from "./routes/Reconcile.js";
import { Hr } from "./routes/Hr.js";
import { Settings } from "./routes/Settings.js";
import { Team } from "./routes/Team.js";

type ThemeName = "white" | "g100";

export function App() {
  const { user, isLoading } = useAuth();
  const { pathname } = useLocation();
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => utils.auth.me.invalidate() });
  const [theme, setTheme] = useState<ThemeName>(
    () => (localStorage.getItem("esti-theme") as ThemeName) || "white",
  );
  function toggleTheme() {
    setTheme((t) => {
      const next: ThemeName = t === "white" ? "g100" : "white";
      localStorage.setItem("esti-theme", next);
      return next;
    });
  }

  // Only staff read settings; CLIENT users never reach this query.
  const settingsQ = trpc.settings.get.useQuery(undefined, { enabled: !!user && user.role !== "CLIENT" });
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;
  const isStaff = !!user && (user.role === "OWNER" || (user.role === "CONSULTANT" && !user.consultantId));
  const firmQ = trpc.firm.get.useQuery(undefined, { enabled: isStaff });
  const firmName = firmQ.data?.companyName ?? "AORMS";
  const alertsQ = trpc.notifications.list.useQuery(undefined, {
    enabled: isStaff,
    refetchInterval: 60000,
  });
  const alertCount = alertsQ.data?.length ?? 0;

  if (isLoading) return <Loading withOverlay description="Loading ESTI" />;
  if (!user)
    return (
      <Theme theme={theme}>
        <Login />
      </Theme>
    );
  // Client-role users get the read-only portal, not the office workspace.
  if (user.role === "CLIENT") return <Portal />;
  // External consultants (scoped to a consultant record) get the collaborator portal.
  if (user.role === "CONSULTANT" && user.consultantId) return <CollaboratorPortal />;

  const nav: { label: string; to: string; icon: CarbonIconType }[] = [
    { label: "Dashboard", to: "/", icon: DashboardIcon },
    { label: alertCount > 0 ? `Alerts (${alertCount})` : "Alerts", to: "/alerts", icon: Notification },
    { label: "Projects", to: "/projects", icon: Building },
    { label: "Clients", to: "/clients", icon: UserMultiple },
    { label: "Consultants", to: "/consultants", icon: Partnership },
    ...(hrEnabled
      ? [
          { label: "Team", to: "/team", icon: UserMultiple },
          { label: "HR", to: "/hr", icon: Identification },
        ]
      : []),
    { label: "Reconcile", to: "/reconcile", icon: Wallet },
    { label: "Master DSR", to: "/dsr", icon: Catalog },
    { label: "Company", to: "/company", icon: Enterprise },
    { label: "Settings", to: "/settings", icon: SettingsIcon },
  ];

  return (
    <Theme theme={theme}>
      <Header aria-label="ESTI AORMS">
        <HeaderName prefix="ESTI">{firmName}</HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label={theme === "white" ? "Switch to dark theme" : "Switch to light theme"}
            onClick={toggleTheme}
          >
            {theme === "white" ? <Asleep size={20} /> : <Light size={20} />}
          </HeaderGlobalAction>
          <HeaderGlobalAction aria-label="Sign out" onClick={() => logout.mutate()}>
            <Logout size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>
      <SideNav aria-label="Side navigation" isRail>
        <SideNavItems>
          {nav.map((n) => (
            <SideNavLink
              key={n.to}
              as={Link}
              to={n.to}
              renderIcon={n.icon}
              isActive={pathname === n.to}
            >
              {n.label}
            </SideNavLink>
          ))}
        </SideNavItems>
      </SideNav>
      <Content>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/consultants" element={<Consultants />} />
          <Route path="/reconcile" element={<Reconcile />} />
          {hrEnabled && <Route path="/team" element={<Team />} />}
          {hrEnabled && <Route path="/hr" element={<Hr />} />}
          <Route path="/dsr" element={<MasterDsr />} />
          <Route path="/company" element={<Company />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Content>
      <FloatingCalculator />
    </Theme>
  );
}
