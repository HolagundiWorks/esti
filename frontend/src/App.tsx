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
import { Dashboard } from "./routes/Dashboard.js";
import { Login } from "./routes/Login.js";
import { ProjectDetail } from "./routes/ProjectDetail.js";
import { Projects } from "./routes/Projects.js";

const NAV = [
  { label: "Dashboard", to: "/" },
  { label: "Projects", to: "/projects" },
  { label: "Clients", to: "/clients" },
];

export function App() {
  const { user, isLoading } = useAuth();
  const { pathname } = useLocation();
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => utils.auth.me.invalidate() });

  if (isLoading) return <Loading withOverlay description="Loading ESTI" />;
  if (!user) return <Login />;

  return (
    <>
      <Header aria-label="ESTI AORMS">
        <HeaderName prefix="ESTI">AORMS</HeaderName>
      </Header>
      <SideNav aria-label="Side navigation" isRail expanded>
        <SideNavItems>
          {NAV.map((n) => (
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Content>
    </>
  );
}
