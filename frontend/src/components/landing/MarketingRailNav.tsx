import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import ArchitectureOutlinedIcon from "@mui/icons-material/ArchitectureOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import { useLocation } from "react-router-dom";
import { AormsLogo } from "../AormsLogo.js";
import {
  railPageLinkIsActive,
  type MarketingPageLink,
  type MarketingRailIcon,
} from "../../lib/marketing-page-nav.js";

const RAIL_ICONS: Record<MarketingRailIcon, typeof HomeOutlinedIcon> = {
  platform: HomeOutlinedIcon,
  architecture: ArchitectureOutlinedIcon,
  consultancy: EngineeringOutlinedIcon,
  wiki: MenuBookOutlinedIcon,
  blog: ArticleOutlinedIcon,
  about: InfoOutlinedIcon,
  legal: GavelOutlinedIcon,
  "design-system": PaletteOutlinedIcon,
};

function RailIcon({ name }: { name: MarketingRailIcon }) {
  const Icon = RAIL_ICONS[name];
  return <Icon fontSize="small" aria-hidden />;
}

export function MarketingRailHeader({
  isMobile,
  mobileOpen,
  brandHref = "/#platform",
  onToggleMobile,
}: {
  isMobile: boolean;
  mobileOpen: boolean;
  /** Context-aware home anchor (platform `/` vs wiki hub). */
  brandHref?: string;
  onToggleMobile: () => void;
}) {
  return (
    <header className="lp2-rail__header">
      <a href={brandHref} className="lp2-rail__brand" aria-label="AORMS home">
        <AormsLogo variant="rail" className="lp2-rail__brand-wordmark" />
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
      ) : null}
    </header>
  );
}

export function MarketingRailNav({
  links,
  pathname,
  onNavigate,
}: {
  links: readonly MarketingPageLink[];
  pathname: string;
  onNavigate: () => void;
}) {
  const { hash } = useLocation();
  return (
    <>
      <p className="lp2-rail__nav-label" id="lp2-rail-pages-label">
        Pages
      </p>
      <nav className="lp2-rail__nav" aria-labelledby="lp2-rail-pages-label">
        {links.map((l) => {
          const active = railPageLinkIsActive(l.href, pathname, hash);
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
            </a>
          );
        })}
      </nav>
    </>
  );
}
