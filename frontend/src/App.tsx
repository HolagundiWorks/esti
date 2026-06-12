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
  Stack,
  Theme,
} from "@carbon/react";
import {
  Building,
  Catalog,
  ChartCustom,
  Dashboard as DashboardIcon,
  Document,
  Enterprise,
  Logout,
  Money,
  TaskComplete,
  User,
  UserMultiple,
  type CarbonIconType,
} from "@carbon/icons-react";
import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { can, isStaffRole } from "@esti/contracts";
import { ThemeContext } from "./lib/theme-context.js";
import { useAuth } from "./lib/auth.js";
import { trpc } from "./lib/trpc.js";
import { AlertsBell } from "./components/AlertsBell.js";
import { PersonalPanel } from "./components/PersonalPanel.js";
import {
  fmtPomTime,
  POMODORO_MODE_LABEL,
  PomodoroProvider,
  usePomodoro,
} from "./contexts/PomodoroContext.js";
import { Alerts } from "./routes/Alerts.js";
import { ArchivedProjects } from "./routes/ArchivedProjects.js";
import { AuditLog } from "./routes/AuditLog.js";
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
import { KnowledgeBank } from "./routes/KnowledgeBank.js";
import { Portal } from "./routes/Portal.js";
import { ProjectDetail } from "./routes/ProjectDetail.js";
import { Projects } from "./routes/Projects.js";
import { Reconcile } from "./routes/Reconcile.js";
import { Hr } from "./routes/Hr.js";
import { Settings } from "./routes/Settings.js";
import { Work } from "./routes/Work.js";
import { SteelArranger } from "./routes/SteelArranger.js";
import { Team } from "./routes/Team.js";
import { Users } from "./routes/Users.js";

type ThemeName = "white" | "g100";

// ─── Header clock ─────────────────────────────────────────────────────────────

function HeaderClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const date = now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return <span className="esti-header-clock">{date} · {time}</span>;
}

// ─── Floating Pomodoro overlay ────────────────────────────────────────────────
// 20% opacity non-interactive overlay shown while a session is running.

function PomodoroFloat() {
  const pom = usePomodoro();
  if (!pom.running) return null;
  return (
    <div className="esti-pomodoro-float">
      <p>{POMODORO_MODE_LABEL[pom.mode]}</p>
      <p>{fmtPomTime(pom.timeLeft)}</p>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export function App() {
  return (
    <PomodoroProvider>
      <AppShell />
    </PomodoroProvider>
  );
}

function AppShell() {
  const { user, isLoading } = useAuth();
  const { pathname } = useLocation();
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });
  const [theme, setTheme] = useState<ThemeName>(
    () => (localStorage.getItem("esti-theme") as ThemeName) || "white",
  );
  const [panelOpen, setPanelOpen] = useState(false);

  function toggleTheme() {
    setTheme((t) => {
      const next: ThemeName = t === "white" ? "g100" : "white";
      localStorage.setItem("esti-theme", next);
      return next;
    });
  }

  // Only staff read settings; CLIENT users never reach this query.
  const settingsQ = trpc.settings.get.useQuery(undefined, {
    enabled: !!user && user.role !== "CLIENT",
  });
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;
  const isStaff =
    !!user &&
    (isStaffRole(user.role) ||
      (user.role === "CONSULTANT" && !user.consultantId));
  const firmQ = trpc.firm.get.useQuery(undefined, { enabled: isStaff });
  const firmName = firmQ.data?.companyName ?? "AORMS";

  if (isLoading) return <Loading withOverlay description="Loading ESTI" />;
  if (!user)
    return (
      <Theme theme={theme}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="*"
            element={<Landing theme={theme} onToggleTheme={toggleTheme} />}
          />
        </Routes>
      </Theme>
    );
  // Client-role users get the read-only portal, not the office workspace.
  if (user.role === "CLIENT") return <Portal />;
  // External consultants (scoped to a consultant record) get the collaborator portal.
  if (user.role === "CONSULTANT" && user.consultantId)
    return <CollaboratorPortal />;

  type NavLink = { label: string; to: string; icon?: CarbonIconType };
  // Grouped navigation (modules → sub-modules).
  const links: NavLink[] = [
    { label: "Dashboard", to: "/", icon: DashboardIcon },
    { label: "Projects", to: "/projects", icon: Building },
    { label: "Work", to: "/tasks", icon: TaskComplete },
    { label: "Knowledge Bank", to: "/knowledge-bank", icon: Catalog },
    { label: "SteelFlow", to: "/steel-arranger", icon: ChartCustom },
  ];
  const groups: { label: string; icon: CarbonIconType; items: NavLink[] }[] = [
    {
      label: "People",
      icon: UserMultiple,
      items: [
        { label: "Clients", to: "/clients" },
        { label: "Consultants", to: "/consultants" },
        ...(hrEnabled
          ? [
              { label: "Team", to: "/team" },
              { label: "HR", to: "/hr" },
            ]
          : []),
      ],
    },
    {
      label: "Accounting",
      icon: Money,
      items: [
        { label: "Invoices", to: "/invoices" },
        ...(can(user.role, "fees:manage")
          ? [{ label: "Fee proposals", to: "/accounting/fees" }]
          : []),
        { label: "Reconciliation", to: "/reconcile" },
        ...(can(user.role, "reports:view")
          ? [{ label: "GST / TDS filing", to: "/filing" }]
          : []),
      ],
    },
    {
      label: "Office",
      icon: Document,
      items: [
        ...(can(user.role, "fees:manage")
          ? [{ label: "Proposals", to: "/office/proposals" }]
          : []),
        { label: "Letters", to: "/office/letters" },
        { label: "Contracts", to: "/office/contracts" },
      ],
    },
    {
      label: "Admin",
      icon: Enterprise,
      items: [
        { label: "Company", to: "/company" },
        ...(can(user.role, "firm:admin")
          ? [{ label: "Users", to: "/users" }]
          : []),
        ...(can(user.role, "firm:admin")
          ? [{ label: "Audit log", to: "/audit" }]
          : []),
        ...(can(user.role, "project:delete")
          ? [{ label: "Archived projects", to: "/archived-projects" }]
          : []),
        { label: "My profile", to: "/settings" },
      ],
    },
  ];

  return (
    <ThemeContext.Provider value={theme}>
      <Theme theme={theme}>
        <div className="esti-app-shell">
          <Theme theme="g100">
            <Header aria-label="ESTI AORMS">
              <HeaderName prefix="ESTI">{firmName}</HeaderName>
              <HeaderGlobalBar>
                <HeaderClock />
                <AlertsBell />
                <HeaderGlobalAction
                  aria-label={panelOpen ? "Close My Space" : "Open My Space"}
                  isActive={panelOpen}
                  onClick={() => setPanelOpen((o) => !o)}
                >
                  <User size={20} />
                </HeaderGlobalAction>
                <HeaderGlobalAction
                  aria-label="Sign out"
                  onClick={() => logout.mutate()}
                >
                  <Logout size={20} />
                </HeaderGlobalAction>
              </HeaderGlobalBar>
            </Header>
          </Theme>
          <SideNav aria-label="Side navigation" isRail>
            <SideNavItems>
              {links.map((n) => (
                <SideNavLink
                  key={n.to}
                  as={Link}
                  to={n.to}
                  renderIcon={n.icon ?? DashboardIcon}
                  isActive={pathname === n.to}
                >
                  {n.label}
                </SideNavLink>
              ))}
              {groups.map((g) => (
                <SideNavMenu
                  key={g.label}
                  title={g.label}
                  renderIcon={g.icon}
                  defaultExpanded={g.items.some((it) => it.to === pathname)}
                >
                  {g.items.map((it) => (
                    <SideNavMenuItem
                      key={it.to}
                      as={Link}
                      to={it.to}
                      isActive={pathname === it.to}
                    >
                      {it.label}
                    </SideNavMenuItem>
                  ))}
                </SideNavMenu>
              ))}
            </SideNavItems>
          </SideNav>
          <Content className="esti-app-content">
            <main className="esti-grow">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route
                  path="/activity"
                  element={<Navigate to="/tasks?tab=activity" replace />}
                />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/compliance" element={<KnowledgeBank />} />
                <Route path="/knowledge-bank" element={<KnowledgeBank />} />
                <Route path="/invoices" element={<Invoices />} />
                {can(user.role, "fees:manage") && (
                  <Route path="/accounting/fees" element={<FeeProposals />} />
                )}
                {can(user.role, "fees:manage") && (
                  <Route path="/office/proposals" element={<Proposals />} />
                )}
                <Route path="/office/letters" element={<Letters />} />
                <Route path="/office/contracts" element={<Contracts />} />
                <Route path="/tasks" element={<Work />} />
                <Route
                  path="/workload"
                  element={<Navigate to="/tasks?tab=workload" replace />}
                />
                <Route path="/clients" element={<Clients />} />
                <Route path="/consultants" element={<Consultants />} />
                <Route path="/reconcile" element={<Reconcile />} />
                {hrEnabled && <Route path="/team" element={<Team />} />}
                {hrEnabled && <Route path="/hr" element={<Hr />} />}
                <Route
                  path="/dsr"
                  element={<Navigate to="/knowledge-bank" replace />}
                />
                {can(user.role, "reports:view") && (
                  <Route path="/filing" element={<Filing />} />
                )}
                <Route path="/company" element={<Company />} />
                {can(user.role, "firm:admin") && (
                  <Route path="/users" element={<Users />} />
                )}
                {can(user.role, "firm:admin") && (
                  <Route path="/audit" element={<AuditLog />} />
                )}
                {can(user.role, "project:delete") && (
                  <Route
                    path="/archived-projects"
                    element={<ArchivedProjects />}
                  />
                )}
                <Route path="/settings" element={<Settings />} />
                <Route path="/steel-arranger" element={<SteelArranger />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <footer className="esti-footer">
              <Stack orientation="horizontal" gap={4}>
                <p>
                  <strong>ESTI</strong> — Architectural Office Resource
                  Management System
                </p>
                <p>·</p>
                <a href="mailto:hi@aorms.in">hi@aorms.in</a>
                <p>·</p>
                <p>Holagundi Consulting Works</p>
              </Stack>
            </footer>
          </Content>
          <PersonalPanel
            isOpen={panelOpen}
            onClose={() => setPanelOpen(false)}
            userName={user.fullName}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
          <PomodoroFloat />
        </div>
      </Theme>
    </ThemeContext.Provider>
  );
}
