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
import { Clients } from "./routes/Clients.js";
import { Consultants } from "./routes/Consultants.js";
import { Dashboard } from "./routes/Dashboard.js";
import { Login } from "./routes/Login.js";
import { Portal } from "./routes/Portal.js";
import { ProjectDetail } from "./routes/ProjectDetail.js";
import { Projects } from "./routes/Projects.js";
import { Reconcile } from "./routes/Reconcile.js";
import { Settings } from "./routes/Settings.js";

export function App() {
  const { user, isLoading } = useAuth();
  const { pathname } = useLocation();
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => utils.auth.me.invalidate() });
  // Only staff read settings; CLIENT users never reach this query.
  const settingsQ = trpc.settings.get.useQuery(undefined, { enabled: !!user && user.role !== "CLIENT" });
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;

  if (isLoading) return <Loading withOverlay description="Loading ESTI" />;
  if (!user) return <Login />;
  // Client-role users get the read-only portal, not the office workspace.
  if (user.role === "CLIENT") return <Portal />;

  const nav = [
    { label: "Dashboard", to: "/" },
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
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/consultants" element={<Consultants />} />
          <Route path="/reconcile" element={<Reconcile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Content>
    </>
  );
}
