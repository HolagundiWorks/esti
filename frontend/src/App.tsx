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
  SideNavMenu,
  SideNavMenuItem,
  Theme,
} from "@carbon/react";
import {
  Asleep,
  Building,
  Catalog,
  Dashboard as DashboardIcon,
  Document,
  Enterprise,
  Money,
  Light,
  Logout,
  TaskComplete,
  UserMultiple,
  type CarbonIconType,
} from "@carbon/icons-react";
import { useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { can, isStaffRole } from "@esti/contracts";
import { useAuth } from "./lib/auth.js";
import { trpc } from "./lib/trpc.js";
import { AlertsBell } from "./components/AlertsBell.js";
import { FloatingCalculator } from "./components/FloatingCalculator.js";
import { Alerts } from "./routes/Alerts.js";
import { Clients } from "./routes/Clients.js";
import { CollaboratorPortal } from "./routes/CollaboratorPortal.js";
import { Company } from "./routes/Company.js";
import { Consultants } from "./routes/Consultants.js";
import { Contracts } from "./routes/Contracts.js";
import { Letters } from "./routes/Letters.js";
import { Dashboard } from "./routes/Dashboard.js";
import { FeeProposals } from "./routes/FeeProposals.js";
import { Filing } from "./routes/Filing.js";
import { Invoices } from "./routes/Invoices.js";
import { Proposals } from "./routes/Proposals.js";
import { Landing } from "./routes/Landing.js";
import { Login } from "./routes/Login.js";
import { MasterDsr } from "./routes/MasterDsr.js";
import { Portal } from "./routes/Portal.js";
import { ProjectDetail } from "./routes/ProjectDetail.js";
import { Projects } from "./routes/Projects.js";
import { Reconcile } from "./routes/Reconcile.js";
import { Hr } from "./routes/Hr.js";
import { Settings } from "./routes/Settings.js";
import { Tasks } from "./routes/Tasks.js";
import { Team } from "./routes/Team.js";
import { Users } from "./routes/Users.js";

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
  const isStaff =
    !!user && (isStaffRole(user.role) || (user.role === "CONSULTANT" && !user.consultantId));
  const firmQ = trpc.firm.get.useQuery(undefined, { enabled: isStaff });
  const firmName = firmQ.data?.companyName ?? "AORMS";

  if (isLoading) return <Loading withOverlay description="Loading ESTI" />;
  if (!user)
    return (
      <Theme theme={theme}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Landing theme={theme} onToggleTheme={toggleTheme} />} />
        </Routes>
      </Theme>
    );
  // Client-role users get the read-only portal, not the office workspace.
  if (user.role === "CLIENT") return <Portal />;
  // External consultants (scoped to a consultant record) get the collaborator portal.
  if (user.role === "CONSULTANT" && user.consultantId) return <CollaboratorPortal />;

  type NavLink = { label: string; to: string };
  // Grouped navigation (modules → sub-modules).
  const links: NavLink[] = [
    { label: "Dashboard", to: "/" },
    { label: "Projects", to: "/projects" },
    { label: "Tasks", to: "/tasks" },
  ];
  const groups: { label: string; icon: CarbonIconType; items: NavLink[] }[] = [
    {
      label: "People",
      icon: UserMultiple,
      items: [
        { label: "Clients", to: "/clients" },
        { label: "Consultants", to: "/consultants" },
        ...(hrEnabled ? [{ label: "Team", to: "/team" }, { label: "HR", to: "/hr" }] : []),
      ],
    },
    {
      label: "Accounting",
      icon: Money,
      items: [
        { label: "Invoices", to: "/invoices" },
        ...(can(user.role, "fees:manage") ? [{ label: "Fee proposals", to: "/accounting/fees" }] : []),
        { label: "Reconciliation", to: "/reconcile" },
        ...(can(user.role, "reports:view") ? [{ label: "GST / TDS filing", to: "/filing" }] : []),
      ],
    },
    {
      label: "Office",
      icon: Document,
      items: [
        ...(can(user.role, "fees:manage") ? [{ label: "Proposals", to: "/office/proposals" }] : []),
        { label: "Letters", to: "/office/letters" },
        { label: "Contracts", to: "/office/contracts" },
      ],
    },
    {
      label: "Resources",
      icon: Catalog,
      items: [{ label: "Master DSR", to: "/dsr" }],
    },
    {
      label: "Admin",
      icon: Enterprise,
      items: [
        { label: "Company", to: "/company" },
        ...(can(user.role, "firm:admin") ? [{ label: "Users", to: "/users" }] : []),
        { label: "My profile", to: "/settings" },
      ],
    },
  ];

  return (
    <Theme theme={theme}>
      {/* Full-height themed shell so the page background fills the viewport in
          dark theme (no white strip below the content). */}
      <div style={{ minHeight: "100vh", background: "var(--cds-background)" }}>
      <Header aria-label="ESTI AORMS">
        <HeaderName prefix="ESTI">{firmName}</HeaderName>
        <HeaderGlobalBar>
          <AlertsBell />
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
          {links.map((n) => (
            <SideNavLink key={n.to} as={Link} to={n.to} renderIcon={n.to === "/" ? DashboardIcon : n.to === "/tasks" ? TaskComplete : Building} isActive={pathname === n.to}>
              {n.label}
            </SideNavLink>
          ))}
          {groups.map((g) => (
            <SideNavMenu key={g.label} title={g.label} renderIcon={g.icon} defaultExpanded={g.items.some((it) => it.to === pathname)}>
              {g.items.map((it) => (
                <SideNavMenuItem key={it.to} as={Link} to={it.to} isActive={pathname === it.to}>
                  {it.label}
                </SideNavMenuItem>
              ))}
            </SideNavMenu>
          ))}
        </SideNavItems>
      </SideNav>
      <Content style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 3rem)" }}>
        <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/invoices" element={<Invoices />} />
          {can(user.role, "fees:manage") && <Route path="/accounting/fees" element={<FeeProposals />} />}
          {can(user.role, "fees:manage") && <Route path="/office/proposals" element={<Proposals />} />}
          <Route path="/office/letters" element={<Letters />} />
          <Route path="/office/contracts" element={<Contracts />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/consultants" element={<Consultants />} />
          <Route path="/reconcile" element={<Reconcile />} />
          {hrEnabled && <Route path="/team" element={<Team />} />}
          {hrEnabled && <Route path="/hr" element={<Hr />} />}
          <Route path="/dsr" element={<MasterDsr />} />
          {can(user.role, "reports:view") && <Route path="/filing" element={<Filing />} />}
          <Route path="/company" element={<Company />} />
          {can(user.role, "firm:admin") && <Route path="/users" element={<Users />} />}
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </div>
        <footer
          style={{
            marginTop: "2.5rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--cds-border-subtle)",
            color: "var(--cds-text-secondary)",
            fontSize: "0.8125rem",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span>ESTI — AORMS</span>
          <span>·</span>
          <a href="mailto:hi@aorms.in" style={{ color: "var(--cds-link-primary)" }}>hi@aorms.in</a>
          <span>·</span>
          <span>Developed by Holagundi Consulting Works</span>
        </footer>
      </Content>
      <FloatingCalculator />
      </div>
    </Theme>
  );
}
