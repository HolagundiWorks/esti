import {
  Button,
  Header,
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

// Absolute "/#section" links so the nav works from any route (e.g. /blog), not
// just the landing page where the in-page anchors live.
const NAV = [
  { href: "/#platform", label: "Platform" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/blog", label: "Blog" },
  { href: "/investors", label: "Investors" },
  { href: "/#trial", label: "Get started" },
] as const;

const STATUS_ITEMS = [
  { label: "PROJECTS + FEES + TEAM", dot: "green" },
  { label: "CLIENT PORTALS INCLUDED", dot: "green" },
  { label: "GST + INDIA WORKFLOWS", dot: "green" },
  { label: "AI OFFICE BRIEFINGS", dot: "yellow" },
  { label: "FREE LITE EDITION", dot: "green" },
] as const;

type Dot = "green" | "yellow" | "red" | "white";

function StatusDot({ color }: { color: Dot }) {
  return <span className={`esti-lp-dot esti-lp-dot--${color}`} aria-hidden>●</span>;
}

function LandingStatusBar() {
  return (
    <div className="esti-lp-statusbar" aria-hidden>
      {STATUS_ITEMS.map((item) => (
        <span key={item.label} className="esti-lp-statusbar__item">
          <StatusDot color={item.dot as Dot} />
          {item.label}
        </span>
      ))}
      <span className="esti-lp-statusbar__item esti-lp-statusbar__ver">
        AORMS · v2025.06
      </span>
    </div>
  );
}

export function MarketingShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="esti-landing-shell">
      <SkipToContent href="#main-content" />
      <Theme theme="g100">
        <Header aria-label="AORMS" className="esti-landing-header">
          <HeaderMenuButton
            aria-label={navOpen ? "Close menu" : "Open menu"}
            isActive={navOpen}
            onClick={() => setNavOpen((o) => !o)}
          />
          <HeaderName prefix="" href="/#top" aria-label="AORMS home">
            <span className="esti-landing-header-brand">
              <img
                src="/aorms-logo-white.png"
                alt="AORMS"
                className="esti-landing-brand-logo"
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
            <Button kind="primary" size="sm" href="/login" as="a" className="esti-landing-signin">
              Log in
            </Button>
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
              </HeaderSideNavItems>
            </SideNavItems>
          </SideNav>
        </Header>
      </Theme>
      <Content id="main-content" className="esti-landing-content">
        {children}
      </Content>
      <LandingStatusBar />
    </div>
  );
}
