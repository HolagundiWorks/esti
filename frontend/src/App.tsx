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
  Tag,
  Theme,
} from "@carbon/react";
import {
  Building,
  Catalog,
  Dashboard as DashboardIcon,
  Document,
  Enterprise,
  Events,
  Logout,
  Money,
  Notification,
  Search as SearchIcon,
  TaskComplete,
  UserMultiple,
  type CarbonIconType,
} from "@carbon/icons-react";
import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type ComponentType,
  type LazyExoticComponent,
} from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { can, planAllows, ROLE_RANK, isStaffRole, type PlanFeature } from "@esti/contracts";
import { ThemeContext } from "./lib/theme-context.js";
import { isLandingSlug } from "./lib/landing-slugs.js";
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
// Landing + Login stay eager so the first paint (marketing / sign-in) needs no extra
// chunk fetch. Every other route is code-split below so a landing visitor never
// downloads the authenticated workspace (and its charts/xlsx) bundle.
import { Landing } from "./routes/Landing.js";
import { Signup } from "./routes/Signup.js";
import { Login } from "./routes/Login.js";

// Build variant gate. The public marketing site (landing, blog, investors, one-click
// demo) is included only when VITE_PUBLIC_SITE !== "false". Set it to "false" for the
// firm product build — unauthenticated visitors then go straight to /login, with no
// marketing surfaces shipped. Defaults to public (demo/dev builds).
const PUBLIC_SITE = import.meta.env.VITE_PUBLIC_SITE !== "false";

// Lazily import a named export as a route component (Vite splits each into its own chunk).
// Loader is typed loosely so modules that also export types/constants still satisfy it.
function lazyRoute(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader: () => Promise<any>,
  name: string,
): LazyExoticComponent<ComponentType<unknown>> {
  return lazy(() =>
    loader().then((m) => ({ default: m[name] as ComponentType<unknown> })),
  );
}

const Alerts = lazyRoute(() => import("./routes/Alerts.js"), "Alerts");
const ArchivedProjects = lazyRoute(() => import("./routes/ArchivedProjects.js"), "ArchivedProjects");
const AuditLog = lazyRoute(() => import("./routes/AuditLog.js"), "AuditLog");
const Clients = lazyRoute(() => import("./routes/Clients.js"), "Clients");
const CollaboratorPortal = lazyRoute(() => import("./routes/CollaboratorPortal.js"), "CollaboratorPortal");
const Company = lazyRoute(() => import("./routes/Company.js"), "Company");
const Consultants = lazyRoute(() => import("./routes/Consultants.js"), "Consultants");
const Contractors = lazyRoute(() => import("./routes/Contractors.js"), "Contractors");
const ContractorPortal = lazyRoute(() => import("./routes/ContractorPortal.js"), "ContractorPortal");
const SitePortal = lazyRoute(() => import("./routes/SitePortal.js"), "SitePortal");
const Blog = lazyRoute(() => import("./routes/Blog.js"), "Blog");
const BlogPost = lazyRoute(() => import("./routes/BlogPost.js"), "BlogPost");
const SeoLanding = lazy(() =>
  import("./routes/SeoLanding.js").then((m) => ({ default: m.SeoLanding })),
);
const DemoAutoLogin = lazyRoute(() => import("./routes/DemoAutoLogin.js"), "DemoAutoLogin");
const Investors = lazyRoute(() => import("./routes/Investors.js"), "Investors");
const Legal = lazyRoute(() => import("./routes/Legal.js"), "Legal");
const Tenders = lazyRoute(() => import("./routes/Tenders.js"), "Tenders");
const Construction = lazyRoute(() => import("./routes/Construction.js"), "Construction");
const Contracts = lazyRoute(() => import("./routes/Contracts.js"), "Contracts");
const DocumentsRegister = lazyRoute(() => import("./routes/DocumentsRegister.js"), "DocumentsRegister");
const Letters = lazyRoute(() => import("./routes/Letters.js"), "Letters");
const Dashboard = lazyRoute(() => import("./routes/Dashboard.js"), "Dashboard");
const FeeProposals = lazyRoute(() => import("./routes/FeeProposals.js"), "FeeProposals");
const Filing = lazyRoute(() => import("./routes/Filing.js"), "Filing");
const Invoices = lazyRoute(() => import("./routes/Invoices.js"), "Invoices");
const OfficeExpenses = lazyRoute(() => import("./routes/OfficeExpenses.js"), "OfficeExpenses");
const CashBook = lazyRoute(() => import("./routes/OfficeExpenses.js"), "CashBook");
const Proposals = lazyRoute(() => import("./routes/Proposals.js"), "Proposals");
const KnowledgeBank = lazyRoute(() => import("./routes/KnowledgeBank.js"), "KnowledgeBank");
const Portal = lazyRoute(() => import("./routes/Portal.js"), "Portal");
const ProjectDetail = lazyRoute(() => import("./routes/ProjectDetail.js"), "ProjectDetail");
const Projects = lazyRoute(() => import("./routes/Projects.js"), "Projects");
const Programme = lazyRoute(() => import("./routes/Programme.js"), "Programme");
const Pmc = lazyRoute(() => import("./routes/Pmc.js"), "Pmc");
const Reconcile = lazyRoute(() => import("./routes/Reconcile.js"), "Reconcile");
const Hr = lazyRoute(() => import("./routes/Hr.js"), "Hr");
const SearchPage = lazyRoute(() => import("./routes/Search.js"), "SearchPage");
const AiStudioPage = lazyRoute(() => import("./components/AiStudio.js"), "AiStudioPage");
const Settings = lazyRoute(() => import("./routes/Settings.js"), "Settings");
const Work = lazyRoute(() => import("./routes/Work.js"), "Work");
const Performance = lazyRoute(() => import("./routes/Performance.js"), "Performance");
const Team = lazyRoute(() => import("./routes/Team.js"), "Team");
const Users = lazyRoute(() => import("./routes/Users.js"), "Users");
const SystemAdmin = lazyRoute(() => import("./routes/SystemAdmin.js"), "SystemAdmin");

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

/** Small edition badge in the workspace header (LITE | CORE | ENTERPRISE). */
function PlanChip({ plan }: { plan: string }) {
  const label = plan === "ENTERPRISE" ? "Enterprise" : plan === "CORE" ? "Core" : "Lite";
  const type = plan === "ENTERPRISE" ? "purple" : plan === "CORE" ? "blue" : "green";
  return (
    <span title={`AORMS-${label} subscription`}>
      <Tag size="sm" type={type as "purple" | "blue" | "green"}>
        {label}
      </Tag>
    </span>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export function App() {
  return (
    <PomodoroProvider>
      <UploadAuthProvider>
        {/* One boundary covers the lazy routes rendered in every AppShell branch
            (public paths, portals, and the authenticated workspace). */}
        <Suspense fallback={<Loading withOverlay description="Loading ESTI" />}>
          <AppShell />
        </Suspense>
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
  // Only staff read settings; portal users (CLIENT, CONTRACTOR) never reach this query.
  const settingsQ = trpc.settings.get.useQuery(undefined, {
    enabled: !!user && user.role !== "CLIENT" && user.role !== "CONTRACTOR",
  });
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;
  const pmcEnabled = settingsQ.data?.pmcEnabled ?? false;
  // Plan gates: a Lite firm doesn't see PMC, HR, AI, GST billing, reconciliation,
  // rate books or audit-log nav. planAllows() defaults LITE until settings load.
  const plan = settingsQ.data?.plan ?? "LITE";
  const planAllowsFeature = (feature: PlanFeature) => planAllows(plan, feature);
  // Lite is a fixed workspace with no consultant directory (consultants are only
  // mapped to projects via engagements).
  const isLite = plan === "LITE";
  const isStaff =
    !!user &&
    (isStaffRole(user.role) ||
      (user.role === "CONSULTANT" && !user.consultantId));
  const firmQ = trpc.firm.get.useQuery(undefined, { enabled: isStaff });
  const firmName = firmQ.data?.companyName ?? "AORMS";

  // Public marketing surfaces — only shipped in the public-site (demo/dev) variant.
  if (PUBLIC_SITE && (pathname === "/blog" || pathname.startsWith("/blog/")))
    return (
      <Routes>
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
      </Routes>
    );

  // Public keyword landing pages (SEO) — `/architecture-office-management-software`, etc.
  if (PUBLIC_SITE && isLandingSlug(pathname))
    return <SeoLanding slug={pathname.replace(/^\/+/, "").replace(/\/+$/, "")} />;

  // Public one-click demo launcher — signs into the team demo and redirects.
  if (PUBLIC_SITE && pathname === "/demo")
    return <DemoAutoLogin />;

  // Investor brief — standalone public page, not linked from the marketing nav.
  if (PUBLIC_SITE && pathname === "/investors")
    return <Investors />;

  // Legal — terms, privacy, acceptable use, licensing.
  if (PUBLIC_SITE && pathname === "/legal")
    return <Legal />;

  if (isLoading) return <Loading withOverlay description="Loading ESTI" />;
  if (!user)
    return (
      <Routes>
        <Route path="/login" element={<Theme theme="g100"><Login /></Theme>} />
        <Route path="/signup" element={<Theme theme="g100"><Signup /></Theme>} />
        {/* Public-site builds land on marketing; the firm product goes straight to login. */}
        <Route path="*" element={PUBLIC_SITE ? <Landing /> : <Navigate to="/login" replace />} />
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

  // Contractors (scoped to a contractor record) get the login-based contractor portal.
  if (user.role === "CONTRACTOR" && user.contractorId)
    return (
      <Theme theme="white">
        {user.isDemo && <DemoSwitcherBar currentUserId={user.id} />}
        <div>
          <Routes>
            <Route path="/" element={<ContractorPortal />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Theme>
    );

  // Dedicated site supervisors get the mobile-first site portal only (no office workspace).
  if (user.role === "SITE_SUPERVISOR")
    return (
      <Theme theme="white">
        <Routes>
          <Route path="/" element={<SitePortal />} />
          <Route path="/projects/:projectId" element={<SitePortal />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Theme>
    );

  type NavLink = { label: string; to: string; icon?: CarbonIconType };
  const rank = ROLE_RANK[user.role] ?? 0;
  const atLeast = (r: number) => rank >= r;

  // Top-level links — the IA's standalone areas (Home, Clients, Projects, Work,
  // Knowledge) plus the two cross-cutting Home utilities (Search, Alerts).
  const links: NavLink[] = [
    { label: "Dashboard", to: "/", icon: DashboardIcon },
    // Clients is its own IA area (master CRM); People keeps only internal/external staff.
    ...(can(user.role, "write") ? [{ label: "Clients", to: "/clients", icon: Events }] : []),
    { label: "Projects", to: "/projects", icon: Building },
    { label: "Work", to: "/tasks", icon: TaskComplete },
    ...(planAllowsFeature("knowledgeBank") ? [{ label: "Knowledge", to: "/knowledge-bank", icon: Catalog }] : []),
    { label: "Search", to: "/search", icon: SearchIcon },
    { label: "Alerts", to: "/alerts", icon: Notification },
  ];

  const groups: { label: string; icon: CarbonIconType; items: NavLink[] }[] = [
    {
      label: "People",
      icon: UserMultiple,
      items: [
        // Team, HR, Performance: plan gate + HR module gate + rank
        ...(planAllowsFeature("hr") && hrEnabled
          ? [
              { label: "Team", to: "/team" },
              ...(can(user.role, "hr:manage") ? [{ label: "HR", to: "/hr" }] : []),
              // Performance: L3+ within HR module
              ...(planAllowsFeature("performance") && atLeast(60) ? [{ label: "Performance", to: "/performance" }] : []),
            ]
          : []),
        // Consultants & Contractors directories: L3+ (rank 60). Lite has no
        // consultant directory page (consultants are mapped to projects only).
        ...(atLeast(60) && !isLite ? [{ label: "Consultants", to: "/consultants" }] : []),
        ...(atLeast(60) ? [{ label: "Contractors", to: "/contractors" }] : []),
      ],
    },
    {
      label: "Accounts",
      icon: Money,
      items: [
        // Invoices, expenses, cash book, reconciliation are Lite+ (non-GST billing
        // and basic bank reconciliation work below the GST registration threshold).
        ...(can(user.role, "invoice:manage")
          ? [
              { label: "Invoices", to: "/invoices" },
              { label: "Office expenses", to: "/accounting/office-expenses" },
              { label: "Cash book", to: "/accounting/cash-book" },
              { label: "Reconciliation", to: "/reconcile" },
            ]
          : []),
        // Fee proposals stay on Lite (basic flat fee).
        ...(can(user.role, "fees:manage")
          ? [{ label: "Fee proposals", to: "/accounting/fees" }]
          : []),
        // GST / TDS filing abstracts (returns): Core+ only.
        ...(planAllowsFeature("gstFiling") && can(user.role, "reports:view")
          ? [{ label: "GST / TDS filing", to: "/filing" }]
          : []),
      ],
    },
    {
      label: "Practice",
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
        // Office programme — read-only portfolio Gantt rollup (per-project programme
        // lives in the project workspace). L3+ (rank 60).
        ...(atLeast(60) ? [{ label: "Office programme", to: "/programme" }] : []),
        // PMC portfolio — read-only rollup across PMC engagements (the per-project PM
        // head is the master). Plan + module gate + L3+.
        ...(planAllowsFeature("pmc") && pmcEnabled && atLeast(60) ? [{ label: "PMC portfolio", to: "/pmc" }] : []),
        // Tenders: PMC plan + L3+ (tenders:view, rank 60)
        ...(planAllowsFeature("pmc") && can(user.role, "tenders:view") ? [{ label: "Tenders", to: "/office/tenders" }] : []),
        ...(planAllowsFeature("pmc") && pmcEnabled && atLeast(60) ? [{ label: "Construction", to: "/office/construction" }] : []),
        // AI Studio: needs `ai` plan feature (Core+) + L3+
        ...(planAllowsFeature("ai") && atLeast(60) ? [{ label: "AI Studio", to: "/office/ai-studio" }] : []),
      ],
    },
    {
      label: "Admin",
      icon: Enterprise,
      items: [
        // Company settings: L1 only (firm:admin)
        ...(can(user.role, "firm:admin") ? [{ label: "Company", to: "/company" }] : []),
        ...(can(user.role, "firm:admin") ? [{ label: "Users", to: "/users" }] : []),
        ...(planAllowsFeature("auditLog") && can(user.role, "firm:admin") ? [{ label: "Audit log", to: "/audit" }] : []),
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
                  src="/esti-logo.png"
                  alt="ESTI"
                  className="esti-app-mark"
                />
                {firmName}
              </HeaderName>
              <HeaderGlobalBar>
                <HeaderClock />
                <HeaderPomodoro />
                <PlanChip plan={plan} />
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
