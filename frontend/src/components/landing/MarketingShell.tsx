import { Login } from "@carbon/icons-react";
import {
  Header,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderName,
  HeaderNavigation,
  HeaderMenuItem,
  HeaderSideNavItems,
  SideNav,
  SideNavItems,
  SkipToContent,
  Content,
  Theme,
} from "@carbon/react";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { formatVisitCount } from "../../lib/landing-visit.js";

const NAV = [
  { href: "#platform", label: "Platform" },
  { href: "#impact", label: "Impact" },
  { href: "#workflow", label: "Workflow" },
  { href: "#esticad", label: "ESTICAD" },
  { href: "#beta", label: "Beta access" },
] as const;

export function MarketingShell({
  children,
  visitCount,
}: {
  children: ReactNode;
  visitCount: number | null | undefined;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="esti-landing-shell">
      <SkipToContent href="#main-content" />
      <Theme theme="g100">
        <Header aria-label="ESTI AORMS" className="esti-landing-header">
          <HeaderMenuButton
            aria-label={navOpen ? "Close menu" : "Open menu"}
            isActive={navOpen}
            onClick={() => setNavOpen((o) => !o)}
          />
          <HeaderName prefix="" href="#top" aria-label="AORMS home">
            <span className="esti-landing-header-brand">
              <img
                src="/aorms-logo-white.png"
                alt="AORMS"
                className="esti-landing-brand-logo"
              />
              <img
                src="/esti-mark-white.png"
                alt=""
                aria-hidden
                className="esti-landing-mark"
              />
            </span>
          </HeaderName>
          <HeaderNavigation aria-label="Page sections">
            {NAV.map((n) => (
              <HeaderMenuItem key={n.href} href={n.href}>
                {n.label}
              </HeaderMenuItem>
            ))}
          </HeaderNavigation>
          <HeaderGlobalBar>
            {visitCount != null && visitCount > 0 ? (
              <span className="esti-landing-visit-count">
                {formatVisitCount(visitCount)} visits
              </span>
            ) : null}
            <HeaderGlobalAction
              aria-label="Sign in to workspace"
              tooltipAlignment="end"
              onClick={() => navigate("/login")}
            >
              <Login size={20} />
            </HeaderGlobalAction>
          </HeaderGlobalBar>
          <SideNav
            aria-label="Mobile navigation"
            expanded={navOpen}
            isPersistent={false}
            onOverlayClick={() => setNavOpen(false)}
          >
            <SideNavItems>
              <HeaderSideNavItems>
                {NAV.map((n) => (
                  <HeaderMenuItem
                    key={n.href}
                    href={n.href}
                    onClick={() => setNavOpen(false)}
                  >
                    {n.label}
                  </HeaderMenuItem>
                ))}
                <HeaderMenuItem href="/login" onClick={() => setNavOpen(false)}>
                  Sign in
                </HeaderMenuItem>
              </HeaderSideNavItems>
            </SideNavItems>
          </SideNav>
        </Header>
      </Theme>
      <Content id="main-content" className="esti-landing-content">
        {children}
      </Content>
    </div>
  );
}
