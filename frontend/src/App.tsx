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
  Calendar,
  Catalog,
  Dashboard as DashboardIcon,
  Document,
  Enterprise,
  Logout,
  Money,
  Notification,
  Search as SearchIcon,
  TaskComplete,
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
import { FloatingDock } from "./components/FloatingDock.js";
import { AiAgentCommand } from "./components/AiAgentCommand.js";
import { HeaderPomodoro } from "./components/HeaderPomodoro.js";
import {
  PomodoroProvider,
} from "./contexts/PomodoroContext.js";
import { Alerts } from "./routes/Alerts.js";
import { ArchivedProjects } from "./routes/ArchivedProjects.js";
import { AuditLog } from "./routes/AuditLog.js";
import { Clients } from "./routes/Clients.js";
import { CollaboratorPortal } from "./routes/CollaboratorPortal.js";
import { Company } from "./routes/Company.js";
import { Consultants } from "./routes/Consultants.js";
import { Contractors } from "./routes/Contractors.js";
import { ContractorBidPortal } from "./routes/ContractorBidPortal.js";
import { Tenders } from "./routes/Tenders.js";
import { Construction } from "./routes/Construction.js";
import { Contracts } from "./routes/Contracts.js";
import { DocumentsRegister } from "./routes/DocumentsRegister.js";
import { Letters } from "./routes/Letters.js";
import { Dashboard } from "./routes/Dashboard.js";
import { FeeProposals } from "./routes/FeeProposals.js";
import { Filing } from "./routes/Filing.js";
import { Invoices } from "./routes/Invoices.js";
import { OfficeExpenses, CashBook } from "./routes/OfficeExpenses.js";
import { Proposals } from "./routes/Proposals.js";
import { Landing } from "./routes/Landing.js";
import { Login } from "./routes/Login.js";
import { KnowledgeBank } from "./routes/KnowledgeBank.js";
import { Portal } from "./routes/Portal.js";
import { ProjectDetail } from "./routes/ProjectDetail.js";
import { Projects } from "./routes/Projects.js";
import { Programme } from "./routes/Programme.js";
import { Pmc } from "./routes/Pmc.js";
import { Reconcile } from "./routes/Reconcile.js";
import { Hr } from "./routes/Hr.js";
import { SearchPage } from "./routes/Search.js";
import { AiStudioPage } from "./components/AiStudio.js";
import { Settings } from "./routes/Settings.js";
import { Work } from "./routes/Work.js";
import { Performance } from "./routes/Performance.js";
import { Team } from "./routes/Team.js";
import { Users } from "./routes/Users.js";

type ThemeName = "white" | "g100";

/** Side nav highlight — prefix match for nested routes (projects, tasks, KB). */
function navPathActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  if (to === "/projects") {
    return pathname === "/projects" || pathname.startsWith("/projects/");
  }
  if (to === "/tasks") return pathname === "/tasks" || pathname.startsWith("/tasks");
  if (to === "/knowledge-bank") {
    return pathname === "/knowledge-bank" || pathname.startsWith("/knowledge-bank");
  }
  if (to === "/search") return pathname === "/search";
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** Legacy `/compliance` bookmarks → Knowledge Bank compliance tab. */
function ComplianceRedirect() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set("tab", "compliance");
  const qs = params.toString();
  return <Navigate to={`/knowledge-bank?${qs}`} replace />;
}

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
  return (
    <span className="esti-header-clock">
      {date} · {time}
    </span>
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
  const pmcEnabled = settingsQ.data?.pmcEnabled ?? false;
  const isStaff =
    !!user &&
    (isStaffRole(user.role) ||
      (user.role === "CONSULTANT" && !user.consultantId));
  const firmQ = trpc.firm.get.useQuery(undefined, { enabled: isStaff });
  const firmName = firmQ.data?.companyName ?? "AORMS";

  // Public contractor bid portal — a magic-link page reachable with or without a
  // session (always white-themed, no app chrome).
  if (pathname.startsWith("/bid/"))
    return (
      <Theme theme="white">
        <Routes>
          <Route path="/bid/:token" element={<ContractorBidPortal />} />
        </Routes>
      </Theme>
    );

  if (isLoading) return <Loading withOverlay description="Loading ESTI" />;
  if (!user)
    return (
      <Routes>
        {/* Login follows the saved theme; the marketing landing is always white. */}
        <Route path="/login" element={<Theme theme={theme}><Login /></Theme>} />
        <Route path="*" element={<Landing />} />
      </Routes>
    );
  // Client-role users get the read-only portal, not the office workspace.
  if (user.role === "CLIENT")
    return (
      <Theme theme="white">
        <Routes>
          <Route path="/" element={<Portal />} />
          <Route path="/projects/:projectId" element={<Portal />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Theme>
    );
  // External consultants (scoped to a consultant record) get the collaborator portal.
  if (user.role === "CONSULTANT" && user.consultantId)
    return (
      <Theme theme="white">
        <Routes>
          <Route path="/" element={<CollaboratorPortal />} />
          <Route path="/projects/:projectId" element={<CollaboratorPortal />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Theme>
    );

  type NavLink = { label: string; to: string; icon?: CarbonIconType };
  // Grouped navigation (modules → sub-modules).
  const links: NavLink[] = [
    { label: "Dashboard", to: "/", icon: DashboardIcon },
    { label: "Projects", to: "/projects", icon: Building },
    { label: "Work", to: "/tasks", icon: TaskComplete },
    { label: "Programme", to: "/programme", icon: Calendar },
    ...(pmcEnabled ? [{ label: "PMC", to: "/pmc", icon: Building }] : []),
    { label: "Knowledge Bank", to: "/knowledge-bank", icon: Catalog },
    { label: "Search", to: "/search", icon: SearchIcon },
    { label: "Alerts", to: "/alerts", icon: Notification },
  ];
  const groups: { label: string; icon: CarbonIconType; items: NavLink[] }[] = [
    {
      label: "People",
      icon: UserMultiple,
      items: [
        { label: "Clients", to: "/clients" },
        { label: "Consultants", to: "/consultants" },
        { label: "Contractors", to: "/contractors" },
        ...(hrEnabled
          ? [
              { label: "Team", to: "/team" },
              { label: "HR", to: "/hr" },
              { label: "Performance", to: "/performance" },
            ]
          : []),
      ],
    },
    {
      label: "Accounting",
      icon: Money,
      items: [
        ...(can(user.role, "invoice:manage")
          ? [
              { label: "Invoices", to: "/invoices" },
              { label: "Office expenses", to: "/accounting/office-expenses" },
              { label: "Cash book", to: "/accounting/cash-book" },
              { label: "Reconciliation", to: "/reconcile" },
            ]
          : []),
        ...(can(user.role, "fees:manage")
          ? [{ label: "Fee proposals", to: "/accounting/fees" }]
          : []),
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
        { label: "Document register", to: "/office/documents" },
        { label: "Letters", to: "/office/letters" },
        { label: "Contracts", to: "/office/contracts" },
        { label: "Tenders", to: "/office/tenders" },
        ...(pmcEnabled ? [{ label: "Construction", to: "/office/construction" }] : []),
        { label: "AI Studio", to: "/office/ai-studio" },
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
              <HeaderName prefix="">
                <img
                  src="/esti-mark-white.png"
                  alt="ESTI"
                  className="esti-app-mark"
                />
                {firmName}
              </HeaderName>
              <HeaderGlobalBar>
                <HeaderClock />
                <HeaderPomodoro />
                <AlertsBell />
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
                  isActive={navPathActive(pathname, n.to)}
                >
                  {n.label}
                </SideNavLink>
              ))}
              {groups.map((g) => (
                <SideNavMenu
                  key={g.label}
                  title={g.label}
                  renderIcon={g.icon}
                  defaultExpanded={g.items.some((it) => navPathActive(pathname, it.to))}
                >
                  {g.items.map((it) => (
                    <SideNavMenuItem
                      key={it.to}
                      as={Link}
                      to={it.to}
                      isActive={navPathActive(pathname, it.to)}
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
                <Route path="/compliance" element={<ComplianceRedirect />} />
                <Route path="/knowledge-bank" element={<KnowledgeBank />} />
                <Route path="/search" element={<SearchPage />} />
                {can(user.role, "invoice:manage") && (
                  <Route path="/invoices" element={<Invoices />} />
                )}
                {can(user.role, "invoice:manage") && (
                  <Route path="/accounting/office-expenses" element={<OfficeExpenses />} />
                )}
                {can(user.role, "invoice:manage") && (
                  <Route path="/accounting/cash-book" element={<CashBook />} />
                )}
                {can(user.role, "fees:manage") && (
                  <Route path="/accounting/fees" element={<FeeProposals />} />
                )}
                {can(user.role, "fees:manage") && (
                  <Route path="/office/proposals" element={<Proposals />} />
                )}
                <Route path="/office/documents" element={<DocumentsRegister />} />
                <Route path="/office/ai-studio" element={<AiStudioPage />} />
                <Route path="/office/letters" element={<Letters />} />
                <Route path="/office/contracts" element={<Contracts />} />
                <Route path="/office/tenders" element={<Tenders />} />
                <Route path="/office/construction" element={<Construction />} />
                <Route path="/tasks" element={<Work />} />
                <Route path="/programme" element={<Programme />} />
                {pmcEnabled && <Route path="/pmc" element={<Pmc />} />}
                <Route path="/work" element={<Navigate to="/tasks" replace />} />
                <Route
                  path="/workload"
                  element={<Navigate to="/tasks?tab=workload" replace />}
                />
                <Route path="/clients" element={<Clients />} />
                <Route path="/consultants" element={<Consultants />} />
                <Route path="/contractors" element={<Contractors />} />
                <Route
                  path="/client-requests"
                  element={<Navigate to="/tasks?tab=client-requests" replace />}
                />
                <Route
                  path="/consultant-requests"
                  element={<Navigate to="/tasks?tab=consultant-requests" replace />}
                />
                {can(user.role, "invoice:manage") && (
                  <Route path="/reconcile" element={<Reconcile />} />
                )}
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
                {hrEnabled && <Route path="/performance" element={<Performance />} />}
                <Route
                  path="/steel-arranger"
                  element={<Navigate to="/knowledge-bank?tab=steelflow" replace />}
                />
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
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  <span>Developed by</span>
                  <img
                    src={theme === "white" ? "/hcw-black.png" : "/hcw-white.png"}
                    alt="Holagundi Consulting Wurkz"
                    style={{ height: 16, verticalAlign: "middle" }}
                  />
                </span>
              </Stack>
            </footer>
          </Content>
          <FloatingDock theme={theme} onToggleTheme={toggleTheme} />
          <AiAgentCommand />
        </div>
      </Theme>
    </ThemeContext.Provider>
  );
}
