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
import { can, ROLE_RANK, isStaffRole } from "@esti/contracts";
import { ThemeContext } from "./lib/theme-context.js";
import { useAuth } from "./lib/auth.js";
import { trpc } from "./lib/trpc.js";
import { AlertsBell } from "./components/AlertsBell.js";
import { UserIdCard } from "./components/UserIdCard.js";
import { FloatingDock } from "./components/FloatingDock.js";
import { AiAgentCommand } from "./components/AiAgentCommand.js";
import { HeaderPomodoro } from "./components/HeaderPomodoro.js";
import { DemoSwitcherBar } from "./components/DemoSwitcherBar.js";
import { PomodoroProvider } from "./contexts/PomodoroContext.js";
import { UploadAuthProvider } from "./lib/uploadAuth.js";
import { Alerts } from "./routes/Alerts.js";
import { ArchivedProjects } from "./routes/ArchivedProjects.js";
import { AuditLog } from "./routes/AuditLog.js";
import { Clients } from "./routes/Clients.js";
import { CollaboratorPortal } from "./routes/CollaboratorPortal.js";
import { Company } from "./routes/Company.js";
import { Consultants } from "./routes/Consultants.js";
import { Contractors } from "./routes/Contractors.js";
import { ContractorBidPortal } from "./routes/ContractorBidPortal.js";
import { ComplianceWidget } from "./routes/ComplianceWidget.js";
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
import { SystemAdmin } from "./routes/SystemAdmin.js";

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
      <UploadAuthProvider>
        <AppShell />
      </UploadAuthProvider>
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

  // Public contractor bid portal — magic-link page, no session required.
  if (pathname.startsWith("/bid/"))
    return (
      <Theme theme="white">
        <Routes>
          <Route path="/bid/:token" element={<ContractorBidPortal />} />
        </Routes>
      </Theme>
    );

  // Public compliance widget — no auth, embeddable as iframe.
  if (pathname === "/compliance-check")
    return <ComplianceWidget />;

  if (isLoading) return <Loading withOverlay description="Loading ESTI" />;
  if (!user)
    return (
      <Routes>
        <Route path="/login" element={<Theme theme="g100"><Login /></Theme>} />
        <Route path="*" element={<Landing />} />
      </Routes>
    );
  // Client-role users get the read-only portal, not the office workspace.
  if (user.role === "CLIENT")
    return (
      <Theme theme="white">
        {user.isDemo && <DemoSwitcherBar currentUserId={user.id} />}
        <div>
          <Routes>
            <Route path="/" element={<Portal />} />
            <Route path="/projects/:projectId" element={<Portal />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Theme>
    );
  // External consultants (scoped to a consultant record) get the collaborator portal.
  if (user.role === "CONSULTANT" && user.consultantId)
    return (
      <Theme theme="white">
        {user.isDemo && <DemoSwitcherBar currentUserId={user.id} />}
        <div>
          <Routes>
            <Route path="/" element={<CollaboratorPortal />} />
            <Route path="/projects/:projectId" element={<CollaboratorPortal />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Theme>
    );

  type NavLink = { label: string; to: string; icon?: CarbonIconType };
  const rank = ROLE_RANK[user.role] ?? 0;
  const atLeast = (r: number) => rank >= r;

  // Top-level links — visible by level
  const links: NavLink[] = [
    { label: "Dashboard", to: "/", icon: DashboardIcon },
    { label: "Projects", to: "/projects", icon: Building },
    { label: "Work", to: "/tasks", icon: TaskComplete },
    // Programme visible to L3+ (rank 60 = SENIOR and above)
    ...(atLeast(60) ? [{ label: "Programme", to: "/programme", icon: Calendar }] : []),
    // PMC: module gate only (L2+ can see if enabled; L3/L4 see if enabled)
    ...(pmcEnabled && atLeast(60) ? [{ label: "PMC", to: "/pmc", icon: Building }] : []),
    { label: "Knowledge Bank", to: "/knowledge-bank", icon: Catalog },
    { label: "Search", to: "/search", icon: SearchIcon },
    { label: "Alerts", to: "/alerts", icon: Notification },
  ];

  const groups: { label: string; icon: CarbonIconType; items: NavLink[] }[] = [
    {
      label: "People",
      icon: UserMultiple,
      items: [
        // Clients: L4+ (write, rank 40)
        ...(can(user.role, "write") ? [{ label: "Clients", to: "/clients" }] : []),
        // Consultants & Contractors: L3+ (rank 60)
        ...(atLeast(60) ? [{ label: "Consultants", to: "/consultants" }] : []),
        ...(atLeast(60) ? [{ label: "Contractors", to: "/contractors" }] : []),
        // Team, HR, Performance: HR module gate + rank
        ...(hrEnabled
          ? [
              { label: "Team", to: "/team" },
              ...(can(user.role, "hr:manage") ? [{ label: "HR", to: "/hr" }] : []),
              // Performance: L3+ within HR module
              ...(atLeast(60) ? [{ label: "Performance", to: "/performance" }] : []),
            ]
          : []),
      ],
    },
    {
      label: "Accounting",
      icon: Money,
      items: [
        // All financial ops: L2+ (invoice:manage / fees:manage, rank 80)
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
        // Proposals: L2+
        ...(can(user.role, "fees:manage")
          ? [{ label: "Proposals", to: "/office/proposals" }]
          : []),
        // Documents, Letters, Contracts: L4+ (write)
        ...(can(user.role, "write")
          ? [
              { label: "Document register", to: "/office/documents" },
              { label: "Letters", to: "/office/letters" },
              { label: "Contracts", to: "/office/contracts" },
            ]
          : []),
        // Tenders: L3+ (tenders:view, rank 60)
        ...(can(user.role, "tenders:view") ? [{ label: "Tenders", to: "/office/tenders" }] : []),
        ...(pmcEnabled && atLeast(60) ? [{ label: "Construction", to: "/office/construction" }] : []),
        // AI Studio: L3+
        ...(atLeast(60) ? [{ label: "AI Studio", to: "/office/ai-studio" }] : []),
      ],
    },
    {
      label: "Admin",
      icon: Enterprise,
      items: [
        // Company settings: L1 only (firm:admin)
        ...(can(user.role, "firm:admin") ? [{ label: "Company", to: "/company" }] : []),
        ...(can(user.role, "firm:admin") ? [{ label: "Users", to: "/users" }] : []),
        ...(can(user.role, "firm:admin") ? [{ label: "Audit log", to: "/audit" }] : []),
        // Archived projects: L2+ (project:delete)
        ...(can(user.role, "project:delete")
          ? [{ label: "Archived projects", to: "/archived-projects" }]
          : []),
        // System Admin panel: is_system_admin overlay only
        ...(user.isSystemAdmin ? [{ label: "System", to: "/system-admin" }] : []),
        // My profile: all staff
        { label: "My profile", to: "/settings" },
      ],
    },
  ].filter((g) => g.items.length > 0);

  return (
    <ThemeContext.Provider value="g100">
      <Theme theme="g100">
        <div className={`esti-app-shell${user.isDemo ? " esti-app-shell--demo" : ""}`}>
          {user.isDemo && <DemoSwitcherBar currentUserId={user.id} />}
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
                <UserIdCard />
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
                {can(user.role, "write") && (
                  <Route path="/office/documents" element={<DocumentsRegister />} />
                )}
                {can(user.role, "write") && (
                  <Route path="/office/letters" element={<Letters />} />
                )}
                {can(user.role, "write") && (
                  <Route path="/office/contracts" element={<Contracts />} />
                )}
                {atLeast(60) && (
                  <Route path="/office/ai-studio" element={<AiStudioPage />} />
                )}
                {can(user.role, "tenders:view") && (
                  <Route path="/office/tenders" element={<Tenders />} />
                )}
                {pmcEnabled && atLeast(60) && (
                  <Route path="/office/construction" element={<Construction />} />
                )}
                <Route path="/tasks" element={<Work />} />
                {atLeast(60) && <Route path="/programme" element={<Programme />} />}
                {pmcEnabled && atLeast(60) && <Route path="/pmc" element={<Pmc />} />}
                <Route path="/work" element={<Navigate to="/tasks" replace />} />
                <Route
                  path="/workload"
                  element={<Navigate to="/tasks?tab=workload" replace />}
                />
                {can(user.role, "write") && (
                  <Route path="/clients" element={<Clients />} />
                )}
                {atLeast(60) && (
                  <Route path="/consultants" element={<Consultants />} />
                )}
                {atLeast(60) && (
                  <Route path="/contractors" element={<Contractors />} />
                )}
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
                {can(user.role, "firm:admin") && (
                  <Route path="/company" element={<Company />} />
                )}
                {can(user.role, "firm:admin") && (
                  <Route path="/users" element={<Users />} />
                )}
                {can(user.role, "firm:admin") && (
                  <Route path="/audit" element={<AuditLog />} />
                )}
                {user.isSystemAdmin && (
                  <Route path="/system-admin" element={<SystemAdmin />} />
                )}
                {can(user.role, "project:delete") && (
                  <Route
                    path="/archived-projects"
                    element={<ArchivedProjects />}
                  />
                )}
                <Route path="/settings" element={<Settings />} />
                {hrEnabled && atLeast(60) && <Route path="/performance" element={<Performance />} />}
                <Route
                  path="/steel-arranger"
                  element={<Navigate to="/knowledge-bank?tab=steelflow" replace />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </Content>
          <FloatingDock />
          <AiAgentCommand />
        </div>
      </Theme>
    </ThemeContext.Provider>
  );
}
