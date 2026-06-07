import {
  Content,
  Header,
  HeaderName,
  Loading,
  SideNav,
  SideNavItems,
  SideNavLink,
} from "@carbon/react";
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

export function App() {
  const { user, isLoading } = useAuth();
  const { pathname } = useLocation();
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => utils.auth.me.invalidate() });
  // Only staff read settings; CLIENT users never reach this query.
  const settingsQ = trpc.settings.get.useQuery(undefined, { enabled: !!user && user.role !== "CLIENT" });
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;
  const isStaff = !!user && (user.role === "OWNER" || (user.role === "CONSULTANT" && !user.consultantId));
  const alertsQ = trpc.notifications.list.useQuery(undefined, {
    enabled: isStaff,
    refetchInterval: 60000,
  });
  const alertCount = alertsQ.data?.length ?? 0;

  if (isLoading) return <Loading withOverlay description="Loading ESTI" />;
  if (!user) return <Login />;
  // Client-role users get the read-only portal, not the office workspace.
  if (user.role === "CLIENT") return <Portal />;
  // External consultants (scoped to a consultant record) get the collaborator portal.
  if (user.role === "CONSULTANT" && user.consultantId) return <CollaboratorPortal />;

  const nav = [
    { label: "Dashboard", to: "/" },
    { label: alertCount > 0 ? `Alerts (${alertCount})` : "Alerts", to: "/alerts" },
    { label: "Projects", to: "/projects" },
    { label: "Clients", to: "/clients" },
    { label: "Consultants", to: "/consultants" },
    ...(hrEnabled
      ? [
          { label: "Team", to: "/team" },
          { label: "HR", to: "/hr" },
        ]
      : []),
    { label: "Reconcile", to: "/reconcile" },
    { label: "Master DSR", to: "/dsr" },
    { label: "Company", to: "/company" },
    { label: "Settings", to: "/settings" },
  ];

  return (
    <>
      <Header aria-label="ESTI AORMS">
        <HeaderName prefix="ESTI">AORMS</HeaderName>
      </Header>
      <SideNav aria-label="Side navigation" isRail expanded>
        <SideNavItems>
          {nav.map((n) => (
            <SideNavLink key={n.to} as={Link} to={n.to} isActive={pathname === n.to}>
              {n.label}
            </SideNavLink>
          ))}
          <SideNavLink as="button" type="button" onClick={() => logout.mutate()}>
            Sign out ({user.email})
          </SideNavLink>
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
    </>
  );
}
