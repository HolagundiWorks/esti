import { Alert, AlertTitle, Box, CircularProgress } from "@mui/material";
import { AORMS_STUDIO, isAormsStudioLegacySlug } from "./lib/product-nomenclature.js";
import {
  Analytics,
  Archive,
  Book,
  Business as Building,
  CompareArrows,
  ContactPage,
  Description as Document,
  Email,
  Apartment as Enterprise,
  Event as Events,
  Badge as Identification,
  CardMembership as License,
  Checklist as ListChecked,
  Map as MapIcon,
  Payments as Money,
  ShoppingCart as Purchase,
  Receipt,
  Assessment as Report,
  Rule,
  Straighten,
  Store,
  Terminal,
  Build as Tools,
  Person as User,
  Group as UserMultiple,
  AccountCircle as UserProfile,
  AccountBalanceWallet as Wallet,
} from "@mui/icons-material";
import {
  lazy,
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
} from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { can, ROLE_RANK, isStaffRole } from "@esti/contracts";
import { ThemeContext } from "./lib/theme-context.js";
import { isLandingSlug } from "./lib/landing-slugs.js";
import { isWikiHost, wikiSubdomainRedirectTarget } from "./lib/wiki-url.js";
import { useAuth } from "./lib/auth.js";
import { setDesktopToken } from "./lib/api-base.js";
import { trpc } from "./lib/trpc.js";
import { LegacyModuleRedirect } from "./components/LegacyModuleRedirect.js";
import { AiAgentCommand } from "./components/AiAgentCommand.js";
import { ActionDock, ActionDockProvider } from "@hcw/ui-kit";
import { AppRibbon } from "./components/shell/AppRibbon.js";
import { AppFooterBar } from "./components/shell/AppFooterBar.js";
import { AormsLogo } from "./components/AormsLogo.js";
import { UsageIdentity } from "./components/identity/UsageIdentity.js";
import { PomodoroProvider } from "./contexts/PomodoroContext.js";
import { UploadAuthProvider } from "./lib/uploadAuth.js";
// Landing + Login stay eager so the first paint (marketing / sign-in) needs no extra
// chunk fetch. Every other route is code-split below so a landing visitor never
// downloads the authenticated workspace (and its charts/xlsx) bundle.
import { Landing } from "./routes/Landing.js";
import { Signup } from "./routes/Signup.js";
import { Login } from "./routes/Login.js";
import { ExternalLogin } from "./routes/ExternalLogin.js";
import { ForcePasswordChange } from "./routes/ForcePasswordChange.js";
import { ForceWorkspaceProfile } from "./routes/ForceWorkspaceProfile.js";
import { RecoverWithBackupCode } from "./routes/RecoverWithBackupCode.js";
import { ForgotPassword } from "./routes/ForgotPassword.js";
import { ResetPassword } from "./routes/ResetPassword.js";

// Build variant gate. The public marketing site (landing, blog, investors, one-click
// demo) is included only when VITE_PUBLIC_SITE !== "false". Set it to "false" for the
// firm product build — unauthenticated visitors then go straight to /login, with no
// marketing surfaces shipped. Defaults to public (demo/dev builds).
const PUBLIC_SITE = import.meta.env.VITE_PUBLIC_SITE !== "false";

// Lazily import a named export as a route component (Vite splits each into its own chunk).
// Loader is typed loosely so modules that also export types/constants still satisfy it.
function lazyRoute(
  loader: () => Promise<any>,
  name: string,
): LazyExoticComponent<ComponentType<unknown>> {
  return lazy(() =>
    loader().then((m) => ({ default: m[name] as ComponentType<unknown> })),
  );
}

const Alerts = lazyRoute(() => import("./routes/Alerts.js"), "Alerts");
const ArchivedProjects = lazyRoute(() => import("./routes/ArchivedProjects.js"), "ArchivedProjects");
const CollaboratorPortal = lazyRoute(() => import("./routes/CollaboratorPortal.js"), "CollaboratorPortal");
const SitePortal = lazyRoute(() => import("./routes/SitePortal.js"), "SitePortal");
const Blog = lazyRoute(() => import("./routes/Blog.js"), "Blog");
const BlogPost = lazyRoute(() => import("./routes/BlogPost.js"), "BlogPost");
const Wiki = lazyRoute(() => import("./routes/Wiki.js"), "Wiki");
const WikiPage = lazyRoute(() => import("./routes/WikiPage.js"), "WikiPage");
const SeoLanding = lazy(() =>
  import("./routes/SeoLanding.js").then((m) => ({ default: m.SeoLanding })),
);
const Investors = lazyRoute(() => import("./routes/Investors.js"), "Investors");
const DesignSystem = lazyRoute(() => import("./routes/DesignSystem.js"), "DesignSystem");
const Legal = lazyRoute(() => import("./routes/Legal.js"), "Legal");
const About = lazyRoute(() => import("./routes/About.js"), "About");
const Contracts = lazyRoute(() => import("./routes/Contracts.js"), "Contracts");
const DocumentsRegister = lazyRoute(() => import("./routes/DocumentsRegister.js"), "DocumentsRegister");
const Letters = lazyRoute(() => import("./routes/Letters.js"), "Letters");
const StudioAbstract = lazyRoute(() => import("./routes/StudioAbstract.js"), "StudioAbstract");
const Filing = lazyRoute(() => import("./routes/Filing.js"), "Filing");
const Invoices = lazyRoute(() => import("./routes/Invoices.js"), "Invoices");
const OfficeExpenses = lazyRoute(() => import("./routes/OfficeExpenses.js"), "OfficeExpenses");
const CashBook = lazyRoute(() => import("./routes/OfficeExpenses.js"), "CashBook");
const Proposals = lazyRoute(() => import("./routes/Proposals.js"), "Proposals");
const Leads = lazyRoute(() => import("./routes/Leads.js"), "Leads");
const SpecCatalogLibrary = lazyRoute(() => import("./routes/SpecCatalogLibrary.js"), "SpecCatalogLibrary");
const ItemLibraryLibrary = lazyRoute(() => import("./routes/ItemLibraryLibrary.js"), "ItemLibraryLibrary");
const ComplianceLibrary = lazyRoute(() => import("./routes/ComplianceLibrary.js"), "ComplianceLibrary");
const MasterPlanLibrary = lazyRoute(() => import("./routes/MasterPlanLibrary.js"), "MasterPlanLibrary");
const StandardsLibrary = lazyRoute(() => import("./routes/StandardsLibrary.js"), "StandardsLibrary");
const Vendors = lazyRoute(() => import("./routes/Vendors.js"), "Vendors");
const Payroll = lazyRoute(() => import("./routes/Payroll.js"), "Payroll");
const Profile = lazyRoute(() => import("./routes/Profile.js"), "Profile");
const Portal = lazyRoute(() => import("./routes/Portal.js"), "Portal");
// Merged Holagundi licensing platform admin (its own Google login + tRPC).
const PlatformAdmin = lazyRoute(() => import("./platform-admin/Panel.js"), "default");
// AORMS account + licence portal (hlp_account) — its own hub destination.
const AccountPortal = lazyRoute(() => import("./routes/AccountPortal.js"), "AccountPortal");
const CompanyAccountPortal = lazyRoute(
  () => import("./routes/CompanyAccountPortal.js"),
  "CompanyAccountPortal",
);
const ProjectDetail = lazyRoute(() => import("./routes/ProjectDetail.js"), "ProjectDetail");
const Projects = lazyRoute(() => import("./routes/Projects.js"), "Projects");
const Reconcile = lazyRoute(() => import("./routes/Reconcile.js"), "Reconcile");
const SearchPage = lazyRoute(() => import("./routes/Search.js"), "SearchPage");
const AiStudioPage = lazyRoute(() => import("./components/AiStudio.js"), "AiStudioPage");
const Work = lazyRoute(() => import("./routes/Work.js"), "Work");
const Team = lazyRoute(() => import("./routes/Team.js"), "Team");
const Hr = lazyRoute(() => import("./routes/Hr.js"), "Hr");
const Performance = lazyRoute(() => import("./routes/Performance.js"), "Performance");
const Clients = lazyRoute(() => import("./routes/Clients.js"), "Clients");
const Consultants = lazyRoute(() => import("./routes/Consultants.js"), "Consultants");
const Contractors = lazyRoute(() => import("./routes/Contractors.js"), "Contractors");
const ContractorPortalStub = lazyRoute(
  () => import("./routes/ContractorPortalStub.js"),
  "ContractorPortalStub",
);
const Lxos = lazyRoute(() => import("./routes/Lxos.js"), "Lxos");
const SystemAdmin = lazyRoute(() => import("./routes/SystemAdmin.js"), "SystemAdmin");


// ─── App ──────────────────────────────────────────────────────────────────────

function WikiSubdomainRedirect() {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={wikiSubdomainRedirectTarget(pathname, search, hash)} replace />;
}

function EstimationToMeasurementRedirect() {
  const { projectId } = useParams();
  return (
    <Navigate
      to={projectId ? `/projects/${projectId}?tab=measurement` : "/projects"}
      replace
    />
  );
}

export function App() {
  return (
    <PomodoroProvider>
      <UploadAuthProvider>
        {/* One boundary covers the lazy routes rendered in every AppShell branch
            (public paths, portals, and the authenticated workspace). */}
        <Suspense fallback={<Box sx={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", zIndex: 9999 }}><CircularProgress aria-label={`Loading ${AORMS_STUDIO.title}`} /></Box>}>
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
    onSuccess: () => {
      setDesktopToken(null);
      return utils.auth.me.invalidate();
    },
  });
  // Only staff read settings; portal users (CLIENT, CONTRACTOR) never reach this query.
  const settingsQ = trpc.settings.get.useQuery(undefined, {
    enabled: !!user && user.role !== "CLIENT" && user.role !== "CONTRACTOR",
  });
  // Plan is licence-derived (Phase B); `license.status` also tells us whether
  // writes are currently gate-blocked (managed install with a lapsed/absent licence).
  const licenseQ = trpc.license.status.useQuery(undefined, {
    enabled: !!user && user.role !== "CLIENT" && user.role !== "CONTRACTOR",
  });
  const licenseBlocked = !!licenseQ.data?.blocked;
  const hrEnabled = settingsQ.data?.hrEnabled ?? false;
  const isStaff =
    !!user &&
    (isStaffRole(user.role) ||
      (user.role === "CONSULTANT" && !user.consultantId));
  const firmQ = trpc.firm.get.useQuery(undefined, { enabled: isStaff });
  const firmName = firmQ.data?.companyName ?? "AORMS";

  // Licensing Console. When VITE_ADMIN_URL is configured (production: the
  // console is its own deployment at admin.DOMAIN), /platform-admin does not
  // exist on this origin at all — the request falls through to normal routing
  // (the console is deliberately not advertised here). Without VITE_ADMIN_URL
  // (dev / self-host), the embedded console serves at /platform-admin or on an
  // admin.* hostname.
  const ADMIN_CONSOLE_URL = (import.meta.env.VITE_ADMIN_URL as string | undefined) ?? "";
  const isAdminSubdomain = /^admin\./.test(window.location.hostname);
  if (!ADMIN_CONSOLE_URL && (isAdminSubdomain || pathname.startsWith("/platform-admin")))
    return <PlatformAdmin />;

  // Legacy wiki subdomain — wiki.DOMAIN → aorms.in/wiki (canonical path).
  if (isWikiHost()) return <WikiSubdomainRedirect />;

  // AORMS Wiki — aorms.in/wiki/*
  if (PUBLIC_SITE && (pathname === "/wiki" || pathname.startsWith("/wiki/"))) {
    return (
      <Routes>
        <Route path="/wiki" element={<Wiki />} />
        <Route path="/wiki/:slug" element={<WikiPage />} />
      </Routes>
    );
  }

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

  // HCW-UI-Kit design system showcase — public reference page.
  if (PUBLIC_SITE && pathname === "/design-system")
    return <DesignSystem />;

  // AORMS-Studio — canonical URL is /login (marketing + sign-in).
  if (PUBLIC_SITE) {
    const pathSlug = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
    if (pathSlug === AORMS_STUDIO.slug || isAormsStudioLegacySlug(pathSlug))
      return <Navigate to="/login" replace />;
  }

  if (PUBLIC_SITE && pathname === "/development")
    return <Navigate to={`/wiki/${AORMS_STUDIO.slug}`} replace />;

  // Investor brief — standalone public page, not linked from the marketing nav.
  if (PUBLIC_SITE && pathname === "/investors")
    return <Investors />;

  // Legal — terms, privacy, acceptable use, licensing.
  if (PUBLIC_SITE && pathname === "/legal")
    return <Legal />;

  // About / E-E-A-T — who builds AORMS and the expertise behind it.
  if (PUBLIC_SITE && pathname === "/about")
    return <About />;

  // Legacy download URL — redirects to the wiki getting-started guide.
  if (PUBLIC_SITE && pathname === "/download")
    return <Navigate to="/wiki/getting-started" replace />;

  // AORMS account + licence portal (hlp_account) — available on every build variant.
  if (pathname === "/account")
    return <AccountPortal />;

  // Company owner portal — profile, members, company licence.
  if (pathname === "/company-account")
    return <CompanyAccountPortal />;

  if (isLoading) return <Box sx={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", zIndex: 9999 }}><CircularProgress aria-label={`Loading ${AORMS_STUDIO.title}`} /></Box>;
  if (!user)
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/access" element={<ExternalLogin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/recover" element={<RecoverWithBackupCode />} />
        {/* Public-site builds land on marketing; the firm product goes straight to login. */}
        <Route path="*" element={PUBLIC_SITE ? <Landing /> : <Navigate to="/login" replace />} />
      </Routes>
    );
  // Preloaded/community accounts must set their own password before anything else.
  if (user.mustChangePassword) return <ForcePasswordChange />;
  if (user.mustCompleteWorkspaceProfile) return <ForceWorkspaceProfile />;

  // Client-role users get the read-only portal, not the office workspace.
  if (user.role === "CLIENT")
    return (
      <div>
        <Routes>
          <Route path="/" element={<Portal />} />
          <Route path="/projects/:projectId" element={<Portal />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    );
  // External consultants (scoped to a consultant record) get the collaborator portal.
  if (user.role === "CONSULTANT" && user.consultantId)
    return (
      <div>
        <Routes>
          <Route path="/" element={<CollaboratorPortal />} />
          <Route path="/projects/:projectId" element={<CollaboratorPortal />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    );

  // Contractors (scoped to a contractor record) get the login-based contractor portal.
  if (user.role === "CONTRACTOR" && user.contractorId)
    return (
      <div>
        <Routes>
          <Route path="/" element={<ContractorPortalStub />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    );

  // Dedicated site supervisors get the mobile-first site portal only (no office workspace).
  if (user.role === "SITE_SUPERVISOR")
    return (
      <Routes>
        <Route path="/" element={<SitePortal />} />
        <Route path="/projects/:projectId" element={<SitePortal />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );

  // Navigation tree — ribbon: Projects · Teams · Office. Library / Third Parties /
  // Admin live in the ribbon hamburger. Studio · Tasks · Search live in the footer.
  // Spec: docs/esti/NAVIGATION.md (synced 2026-07-10).
  type NavLink = { label: string; to: string; icon?: ComponentType<any> };
  type NavNode =
    | (NavLink & { kind?: "link" })
    | { kind: "menu"; label: string; icon?: ComponentType<any>; items: NavNode[] };
  const rank = ROLE_RANK[user.role] ?? 0;
  const atLeast = (r: number) => rank >= r;

  // Prune empty menus recursively so a section with no permitted items disappears.
  const prune = (nodes: NavNode[]): NavNode[] =>
    nodes
      .map((n) =>
        "items" in n ? { ...n, items: prune(n.items) } : n,
      )
      .filter((n) => !("items" in n) || n.items.length > 0);

  // Ribbon: Projects · Clients · Teams · Office. Remaining Third Parties + Library
  // + Admin live in the hamburger. Studio · Tasks · Search live in the footer.
  // Spec: docs/esti/NAVIGATION.md.
  const nav: NavNode[] = prune([
    { label: "Projects", to: "/projects", icon: Building },
    ...(can(user.role, "write")
      ? [{ label: "Clients", to: "/clients", icon: User }]
      : []),
    {
      kind: "menu",
      label: "Teams",
      icon: UserMultiple,
      items: [
        ...(hrEnabled
          ? [
              { label: "Teams", to: "/team", icon: Events },
              ...(atLeast(60)
                ? [{ label: "Performance", to: "/performance", icon: Analytics }]
                : []),
              ...(can(user.role, "hr:manage") ? [{ label: "HR", to: "/hr", icon: Identification }] : []),
            ]
          : []),
      ],
    },
    {
      kind: "menu",
      label: "Office",
      icon: Enterprise,
      items: [
        ...(can(user.role, "write")
          ? [{ label: "Leads", to: "/leads", icon: ContactPage }]
          : []),
        ...(can(user.role, "fees:manage") ? [{ label: "Proposals", to: "/office/proposals", icon: Document }] : []),
        ...(can(user.role, "write")
          ? [
              { label: "Documents", to: "/office/documents", icon: Document },
              { label: "Contracts", to: "/office/contracts", icon: License },
              { label: "Letters", to: "/office/letters", icon: Email },
            ]
          : []),
        // Finance folded into Office.
        ...(can(user.role, "invoice:manage")
          ? [
              { label: "Consultancy Invoices", to: "/invoices", icon: Receipt },
              { label: "Reconcile", to: "/reconcile", icon: CompareArrows },
              { label: "Cashbook", to: "/accounting/cash-book", icon: Wallet },
              { label: "Office Expenses", to: "/accounting/office-expenses", icon: Purchase },
            ]
          : []),
        ...(hrEnabled && can(user.role, "hr:manage")
          ? [{ label: "Payroll", to: "/finance/payroll", icon: Money }]
          : []),
        ...(can(user.role, "reports:view")
          ? [{ label: "Financial Reports", to: "/filing", icon: Report }]
          : []),
      ],
    },
  ]);

  // Admin hamburger: remaining Third Parties, Library, system.
  const adminGroups: { heading: string; items: NavLink[] }[] = [
    {
      heading: "Third Parties",
      items: [
        ...(atLeast(60)
          ? [
              { label: "Consultants", to: "/consultants", icon: UserProfile },
              { label: "Contractors", to: "/contractors", icon: Tools },
            ]
          : []),
        ...(can(user.role, "write") ? [{ label: "Vendors", to: "/vendors", icon: Store }] : []),
      ],
    },
    {
      heading: "Library",
      items: [
        { label: "Specification catalogue", to: "/libraries/spec-catalog", icon: ListChecked },
        { label: "Standard items", to: "/libraries/items", icon: Straighten },
        { label: "Compliance Library", to: "/libraries/compliance", icon: Rule },
        { label: "Master Plan Library", to: "/libraries/master-plans", icon: MapIcon },
        { label: "Standards Library", to: "/libraries/standards", icon: Book },
      ],
    },
    {
      heading: "Admin",
      items: [
        ...(can(user.role, "project:delete")
          ? [{ label: "Archived projects", to: "/archived-projects", icon: Archive }]
          : []),
        ...(user.isSystemAdmin ? [{ label: "System", to: "/system-admin", icon: Terminal }] : []),
      ],
    },
  ].filter((g) => g.items.length > 0);

  const isStudioHome = pathname === "/";

  return (
    <ThemeContext.Provider value="white">
      <ActionDockProvider>
        <div className={`esti-app-shell2${user.isDemo ? " esti-app-shell--demo" : ""}${isStudioHome ? " esti-app-shell2--studio-home" : ""}`}>
          <a href="#esti-main" className="esti-skip-link">
            Skip to main content
          </a>
          <AormsLogo variant="watermark" className="esti-app-logo-float" />
          {/* Ribbon — floating top-right; rails and stage start below the header line. */}
          <AppRibbon nav={nav} firmName={firmName} adminGroups={adminGroups} variant="float" />
          <div className={`esti-app-content2${isStudioHome ? " esti-app-content2--flush-top" : ""}`}>
            <main id="esti-main" className="esti-grow" tabIndex={-1}>
              {licenseBlocked && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <AlertTitle>Workspace licence required</AlertTitle>
                  Your licence is missing or expired — changes are blocked until it is activated. Open Company account → Licence to activate a key.
                </Alert>
              )}
              <Routes>
                <Route path="/" element={<StudioAbstract />} />
                <Route
                  path="/activity"
                  element={<Navigate to="/tasks?tab=activity" replace />}
                />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/libraries/spec-catalog" element={<SpecCatalogLibrary />} />
                <Route path="/libraries/items" element={<ItemLibraryLibrary />} />
                <Route path="/knowledge-bank" element={<Navigate to="/libraries/spec-catalog" replace />} />
                <Route
                  path="/estimation"
                  element={
                    <LegacyModuleRedirect
                      to="/projects"
                      title="Estimation workspace moved"
                      subtitle="Open a project and use the Measurement tab."
                    />
                  }
                />
                <Route
                  path="/estimation/:projectId"
                  element={<EstimationToMeasurementRedirect />}
                />
                <Route
                  path="/libraries/estimates"
                  element={
                    <LegacyModuleRedirect
                      to="/projects"
                      title="Rate books removed"
                      subtitle="Estimation modules were retired — opening Projects."
                    />
                  }
                />
                <Route path="/libraries/compliance" element={<ComplianceLibrary />} />
                <Route path="/libraries/master-plans" element={<MasterPlanLibrary />} />
                <Route path="/libraries/standards" element={<StandardsLibrary />} />
                {atLeast(60) && <Route path="/vendors" element={<Vendors />} />}
                {hrEnabled && can(user.role, "hr:manage") && (
                  <Route path="/finance/payroll" element={<Payroll />} />
                )}
                <Route path="/lxos" element={<Lxos />} />
                <Route path="/leos" element={<Navigate to="/lxos" replace />} />
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
                {/* Unified Proposals (Office); legacy fee-proposal path redirects. */}
                <Route
                  path="/accounting/fees"
                  element={<Navigate to="/office/proposals" replace />}
                />
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
                <Route path="/tasks" element={<Work />} />
                <Route path="/work" element={<Navigate to="/tasks" replace />} />
                {/* Consultancy-only: PMC / Construction / Programme removed. */}
                <Route
                  path="/pmc"
                  element={
                    <LegacyModuleRedirect
                      to="/projects"
                      title="PMC module removed"
                      subtitle="Portfolio management was retired — opening Projects."
                    />
                  }
                />
                <Route
                  path="/programme"
                  element={
                    <LegacyModuleRedirect
                      to="/projects"
                      title="Programme module removed"
                      subtitle="Delivery scheduling lives under each project's Delivery tab."
                    />
                  }
                />
                <Route
                  path="/office/construction"
                  element={
                    <LegacyModuleRedirect
                      to="/projects"
                      title="Construction module removed"
                      subtitle="Site supervision is under Project → Delivery."
                    />
                  }
                />
                <Route
                  path="/workload"
                  element={<Navigate to="/tasks?tab=workload" replace />}
                />
                {/* OFFICE › External Network — individual module pages (V2). */}
                {can(user.role, "write") && (
                  <Route path="/clients" element={<Clients />} />
                )}
                {atLeast(60) && (
                  <Route path="/consultants" element={<Consultants />} />
                )}
                {atLeast(60) && (
                  <Route path="/contractors" element={<Contractors />} />
                )}
                {/* Legacy hub paths → first External Network module. */}
                <Route path="/external-network" element={<Navigate to="/clients" replace />} />
                <Route path="/third-parties" element={<Navigate to="/clients" replace />} />
                {can(user.role, "write") && (
                  <Route path="/leads" element={<Leads />} />
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
                {can(user.role, "invoice:manage") && (
                  <Route path="/finance/reconcile" element={<Navigate to="/reconcile" replace />} />
                )}
                {/* OFFICE › Internal Operations — individual module pages (V2). */}
                {hrEnabled && <Route path="/team" element={<Team />} />}
                {hrEnabled && <Route path="/hr" element={<Hr />} />}
                <Route
                  path="/dsr"
                  element={<Navigate to="/libraries/spec-catalog" replace />}
                />
                {can(user.role, "reports:view") && (
                  <Route path="/filing" element={<Filing />} />
                )}
                {can(user.role, "firm:admin") && (
                  <Route path="/company" element={<Navigate to="/company-account" replace />} />
                )}
                {can(user.role, "firm:admin") && (
                  <Route path="/users" element={<Navigate to="/company-account#members" replace />} />
                )}
                {can(user.role, "firm:admin") && (
                  <Route path="/audit" element={<Navigate to="/company-account#administration" replace />} />
                )}
                <Route path="/account" element={<AccountPortal />} />
                <Route path="/company-account" element={<CompanyAccountPortal />} />
                {user.isSystemAdmin && (
                  <Route path="/system-admin" element={<SystemAdmin />} />
                )}
                {can(user.role, "project:delete") && (
                  <Route
                    path="/archived-projects"
                    element={<ArchivedProjects />}
                  />
                )}
                <Route path="/settings" element={<Navigate to="/account#settings" replace />} />
                <Route path="/profile" element={<Profile />} />
                {hrEnabled && atLeast(60) && (
                  <Route path="/performance" element={<Performance />} />
                )}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
          <UsageIdentity />
          <AiAgentCommand />
          {/* HCW-UI-Kit global action dock — screens publish CTAs via useScreenActions;
              renders nothing until they do (zero regression until adopted). */}
          <ActionDock />
          {/* Taskbar footer (HCW-UI-Kit) — launchers CENTRE (Studio · Tasks · Search ·
              Ask ESTI · Wellness · Pomodoro), tray RIGHT. */}
          <AppFooterBar
            planClass="esti-app-header--pro"
            onSignOut={() => logout.mutate()}
          />
        </div>
      </ActionDockProvider>
    </ThemeContext.Provider>
  );
}
