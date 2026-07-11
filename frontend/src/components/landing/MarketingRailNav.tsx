import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import ArchitectureOutlinedIcon from "@mui/icons-material/ArchitectureOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import { AormsLogo, AormsMark } from "../AormsLogo.js";
import {
  railPageLinkIsActive,
  type MarketingPageLink,
  type MarketingRailIcon,
} from "../../lib/marketing-page-nav.js";

const RAIL_ICONS: Record<MarketingRailIcon, typeof HomeOutlinedIcon> = {
  platform: HomeOutlinedIcon,
  architecture: ArchitectureOutlinedIcon,
  wiki: MenuBookOutlinedIcon,
  blog: ArticleOutlinedIcon,
  legal: GavelOutlinedIcon,
  "design-system": PaletteOutlinedIcon,
};

function RailIcon({ name }: { name: MarketingRailIcon }) {
  const Icon = RAIL_ICONS[name];
  return <Icon fontSize="small" aria-hidden />;
}

export function MarketingRailHeader({
  collapsed,
  isMobile,
  mobileOpen,
  onToggleCollapse,
  onToggleMobile,
}: {
  collapsed: boolean;
  isMobile: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onToggleMobile: () => void;
}) {
  return (
    <header className="lp2-rail__header">
      <a href="/#top" className="lp2-rail__brand" aria-label="AORMS home">
        {collapsed && !isMobile ? (
          <span className="lp2-rail__brand-mark">
            <AormsMark size="rail" />
          </span>
        ) : (
          <AormsLogo variant="rail" className="lp2-rail__brand-wordmark" />
        )}
      </a>
      {isMobile ? (
        <button
          type="button"
          className="lp2-rail__toggle"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={onToggleMobile}
        >
          {mobileOpen ? "×" : "☰"}
        </button>
      ) : (
        <button
          type="button"
          className="lp2-rail__collapse"
          aria-label={collapsed ? "Expand navigation rail" : "Collapse navigation rail"}
          aria-expanded={!collapsed}
          onClick={onToggleCollapse}
        >
          {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
        </button>
      )}
    </header>
  );
}

export function MarketingRailNav({
  links,
  pathname,
  collapsed,
  onNavigate,
}: {
  links: readonly MarketingPageLink[];
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <>
      <p className="lp2-rail__nav-label" id="lp2-rail-pages-label">
        Pages
      </p>
      <nav className="lp2-rail__nav" aria-labelledby="lp2-rail-pages-label">
        {links.map((l) => {
          const active = railPageLinkIsActive(l.href, pathname);
          return (
            <a
              key={l.href}
              href={l.href}
              className={["lp2-rail__link", active ? "lp2-rail__link--active" : ""]
                .filter(Boolean)
                .join(" ")}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
            >
              <span className="lp2-rail__link-icon">
                <RailIcon name={l.icon} />
              </span>
              <span className="lp2-rail__link-label">{l.label}</span>
              {collapsed ? (
                <span className="lp2-rail__link-tip" role="tooltip">
                  {l.label}
                </span>
              ) : null}
            </a>
          );
        })}
      </nav>
    </>
  );
}
