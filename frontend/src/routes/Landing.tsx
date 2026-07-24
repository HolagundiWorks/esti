import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import ArrowForward from "@mui/icons-material/ArrowForwardOutlined";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import ArchitectureOutlined from "@mui/icons-material/ArchitectureOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import GroupsOutlined from "@mui/icons-material/GroupsOutlined";
import InsightsOutlined from "@mui/icons-material/InsightsOutlined";
import {
  GlassRail,
  SectionDock,
  Surface,
  type SectionDockLink,
} from "@hcw/ui-kit";
import { AormsLogo } from "../components/AormsLogo.js";
import {
  AORMS_PLATFORM,
  PLATFORM_FRAMEWORKS,
  PLATFORM_APPS,
  AORMS_STUDIO,
  AORMS_CONSULTANCY,
  EOMS,
  ESTI,
  HUMAN_CENTRIC_WORKS,
} from "../lib/product-nomenclature.js";
import { applyLandingSeo, injectLandingJsonLd } from "../lib/landing-seo.js";
import { useLandingVisitCounter } from "../lib/landing-visit.js";

/** Section anchors — the marketing scroll-spy dock (SectionDock, fixed bottom). */
const SECTIONS: readonly SectionDockLink[] = [
  { href: "#top", label: "Overview" },
  { href: "#frameworks", label: "Frameworks" },
  { href: "#ai", label: "Dual-AI" },
  { href: "#inside", label: "Inside" },
  { href: "#apps", label: "Apps" },
  { href: "#faq", label: "FAQ" },
];

const MODULES = [
  {
    icon: <FolderOutlined fontSize="small" />,
    title: "Projects & phases",
    body: "Every engagement, its phases, tasks, drawings, and decisions on one spine.",
  },
  {
    icon: <ReceiptLongOutlined fontSize="small" />,
    title: "Proposals & GST invoicing",
    body: "COA fee proposals, scope agreements, and compliant invoicing in one flow.",
  },
  {
    icon: <ArchitectureOutlined fontSize="small" />,
    title: "Drawings & transmittals",
    body: "A governed drawing register with issue tracking and document transmittals.",
  },
  {
    icon: <MenuBookOutlined fontSize="small" />,
    title: "Governed library",
    body: "Compliance, standards, and master plans — validated, versioned, and searchable.",
  },
  {
    icon: <GroupsOutlined fontSize="small" />,
    title: "Team, HR & performance",
    body: "Roster, assignments, leave, payroll, and the rolling ASPRF performance score.",
  },
  {
    icon: <InsightsOutlined fontSize="small" />,
    title: "Studio Intelligence",
    body: "A live dashboard and Ask ESTI — answers drawn only from your validated data.",
  },
] as const;

const FAQ = [
  {
    q: "Who is AORMS for?",
    a: `${AORMS_PLATFORM.audience}.`,
  },
  {
    q: "Is my data used to train external models?",
    a: `No. ${ESTI.name} answers only from your validated firm repositories, running on your server — no external API keys required.`,
  },
  {
    q: "What is the difference between EOMS and ESTI?",
    a: `${EOMS.name} is the external knowledge bank — standard codebooks and compliance codes on tap via its API. ${ESTI.name} is the internal agent that answers only from your firm's validated repositories.`,
  },
  {
    q: "Which apps ship today?",
    a: `${AORMS_STUDIO.title} (architecture) and ${AORMS_CONSULTANCY.title} (engineering) are both live on the same spine — ${AORMS_STUDIO.appUrl.replace(/^https:\/\//, "")} and ${AORMS_CONSULTANCY.appUrl.replace(/^https:\/\//, "")}.`,
  },
] as const;

/** Calm section opener — overline + heading + optional lead. */
function SectionHead({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <Stack spacing={1.5} sx={{ mb: 4, maxWidth: 720 }}>
      <Typography variant="overline" color="primary" sx={{ letterSpacing: "0.14em" }}>
        {eyebrow}
      </Typography>
      <Typography variant="h3" component="h2" sx={{ fontWeight: 700, lineHeight: 1.15 }}>
        {title}
      </Typography>
      {lead ? (
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 620 }}>
          {lead}
        </Typography>
      ) : null}
    </Stack>
  );
}

/** Single-page AORMS platform landing — the only marketing surface. */
export function Landing() {
  const visitCount = useLandingVisitCounter();
  const { pathname, hash } = useLocation();

  useEffect(() => {
    applyLandingSeo();
    injectLandingJsonLd();
  }, []);

  useEffect(() => {
    const section = hash.replace(/^#/, "");
    if (!section) return;
    const raf = window.requestAnimationFrame(() => {
      document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [hash]);

  const rail = (
    <Stack sx={{ height: "100%", minHeight: { md: "calc(100vh - 32px)" } }} spacing={3}>
      <Box>
        <RouterLink to="/" aria-label="AORMS home" style={{ display: "inline-block" }}>
          <AormsLogo variant="rail" />
        </RouterLink>
        <Typography
          variant="caption"
          color="text.secondary"
          component="p"
          sx={{ mt: 1, letterSpacing: "0.04em" }}
        >
          {AORMS_PLATFORM.expansion}
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary">
        {AORMS_PLATFORM.tagline}. One governed system for how your office runs and how
        engagements are delivered.
      </Typography>

      <Button
        component={RouterLink}
        to="/login"
        variant="contained"
        endIcon={<ArrowForward />}
        sx={{ alignSelf: "flex-start" }}
      >
        Sign in
      </Button>

      <Box sx={{ flex: 1 }} />

      <Stack spacing={0.5}>
        <Divider sx={{ mb: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {HUMAN_CENTRIC_WORKS.attribution}
        </Typography>
        {visitCount != null ? (
          <Typography variant="caption" color="text.disabled">
            {visitCount.toLocaleString()} visits
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );

  return (
    <>
      <GlassRail glass="clear" mainId="lp-main" rail={rail} railAriaLabel="AORMS">
        <Container maxWidth="lg" disableGutters sx={{ pb: 12 }}>
          {/* Hero */}
          <Box id="top" component="section" sx={{ pt: { xs: 4, md: 8 }, pb: { xs: 6, md: 10 } }}>
            <Box sx={{ mb: 2 }}>
              <AormsLogo variant="hero" />
            </Box>
            <Typography variant="overline" color="primary" sx={{ letterSpacing: "0.14em" }}>
              The operating system for AEC consulting
            </Typography>
            <Typography
              variant="h1"
              sx={{
                mt: 2,
                fontWeight: 800,
                fontSize: { xs: "2.4rem", md: "3.6rem" },
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                maxWidth: 900,
              }}
            >
              {AORMS_PLATFORM.heroHeadline[0]}
              <Box component="span" sx={{ display: "block", color: "text.secondary" }}>
                {AORMS_PLATFORM.heroHeadline[1]}
              </Box>
            </Typography>
            <Typography
              variant="h6"
              component="p"
              color="text.secondary"
              sx={{ mt: 3, maxWidth: 640, fontWeight: 400 }}
            >
              Architecture and engineering practices advise clients across dozens of
              disconnected tools. AORMS consolidates the operational and design frameworks
              of the whole office into one governed workspace, with dual-tier AI.
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 4 }}>
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
              >
                Sign in to {AORMS_STUDIO.title}
              </Button>
              <Button component="a" href="#frameworks" variant="outlined" size="large">
                See how it works
              </Button>
            </Stack>

            {/* From fragmented tools → one system. */}
            <Surface layer="soft" sx={{ mt: 6, p: { xs: 2.5, md: 3 } }}>
              <Typography variant="overline" color="text.secondary">
                Replaces the sprawl
              </Typography>
              <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mt: 1.5 }}>
                {AORMS_PLATFORM.fragmentedTools.map((tool) => (
                  <Typography
                    key={tool}
                    variant="body2"
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      color: "text.secondary",
                      border: (t) => `1px solid ${t.palette.divider}`,
                    }}
                  >
                    {tool}
                  </Typography>
                ))}
                <Typography
                  variant="body2"
                  sx={{ px: 1.5, py: 0.5, fontWeight: 700, color: "primary.main" }}
                >
                  → one operating system
                </Typography>
              </Stack>
            </Surface>
          </Box>

          {/* Frameworks */}
          <Box id="frameworks" component="section" sx={{ py: { xs: 6, md: 9 } }}>
            <SectionHead
              eyebrow="Two frameworks"
              title="Every consulting office runs on two layers"
              lead="AORMS makes both explicit, versioned, and shared — so the practice runs the same way whoever is at the desk."
            />
            <Grid container spacing={3}>
              {Object.values(PLATFORM_FRAMEWORKS).map((fw) => (
                <Grid key={fw.title} size={{ xs: 12, md: 6 }}>
                  <Surface layer="flat" sx={{ p: 3, height: "100%", border: (t) => `1px solid ${t.palette.divider}` }}>
                    <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
                      {fw.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5 }}>
                      {fw.summary}
                    </Typography>
                  </Surface>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Dual-tier AI */}
          <Box id="ai" component="section" sx={{ py: { xs: 6, md: 9 } }}>
            <SectionHead
              eyebrow="Dual-tier AI"
              title="Knowledge bank outside. Firm agent inside."
              lead="Codes and compliance come from EOMS. Answers come only from what your firm has validated."
            />
            <Grid container spacing={3}>
              {[EOMS, ESTI].map((tier) => (
                <Grid key={tier.name} size={{ xs: 12, md: 6 }}>
                  <Surface layer="soft" sx={{ p: 3, height: "100%" }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "baseline" }}>
                      <Typography variant="h5" component="h3" sx={{ fontWeight: 800 }}>
                        {tier.name}
                      </Typography>
                      <Typography variant="overline" color="primary">
                        {tier.role}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.disabled" component="p" sx={{ mt: 0.5 }}>
                      {tier.expansion}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                      {tier.summary}
                    </Typography>
                  </Surface>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Inside — modules */}
          <Box id="inside" component="section" sx={{ py: { xs: 6, md: 9 } }}>
            <SectionHead
              eyebrow="Inside the workspace"
              title="Everything the practice needs, consolidated"
              lead="One workspace for the whole consulting office — no exports, no re-keying, no scattered spreadsheets."
            />
            <Grid container spacing={3}>
              {MODULES.map((m) => (
                <Grid key={m.title} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Surface layer="flat" sx={{ p: 3, height: "100%", border: (t) => `1px solid ${t.palette.divider}` }}>
                    <Box sx={{ color: "primary.main", display: "flex" }}>{m.icon}</Box>
                    <Typography variant="subtitle1" component="h3" sx={{ mt: 1.5, fontWeight: 700 }}>
                      {m.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {m.body}
                    </Typography>
                  </Surface>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Apps */}
          <Box id="apps" component="section" sx={{ py: { xs: 6, md: 9 } }}>
            <SectionHead
              eyebrow="Two apps, one spine"
              title="Architecture and engineering, live."
              lead="Both AEC disciplines run on the same operational spine — deployed as focused apps."
            />
            <Grid container spacing={3}>
              {PLATFORM_APPS.map((app) => (
                <Grid key={app.id} size={{ xs: 12, md: 6 }}>
                  <Surface
                    layer="soft"
                    id={app.id === "architecture" ? "studio" : "consultancy"}
                    sx={{ p: 3, height: "100%" }}
                  >
                    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
                        {app.workspace}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          px: 1,
                          py: 0.25,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: app.status === "live" ? "primary.main" : "text.disabled",
                          border: (t) =>
                            `1px solid ${app.status === "live" ? t.palette.primary.main : t.palette.divider}`,
                        }}
                      >
                        {app.status === "live"
                          ? "Live"
                          : app.status === "launch_gated"
                            ? "Coming soon"
                            : "Roadmap"}
                      </Typography>
                    </Stack>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {app.subtitle}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      {app.body}
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 2 }}>
                      {app.bullets.map((b) => (
                        <Typography key={b} variant="body2" sx={{ display: "flex", gap: 1 }}>
                          <Box component="span" sx={{ color: "primary.main", fontWeight: 700 }}>
                            —
                          </Box>
                          {b}
                        </Typography>
                      ))}
                    </Stack>
                    <Button
                      component="a"
                      href={app.href}
                      variant="contained"
                      size="medium"
                      endIcon={<ArrowForward />}
                      sx={{ mt: 3 }}
                    >
                      {app.cta}
                    </Button>
                  </Surface>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* CTA band — the live (glass) layer. */}
          <Surface layer="glass" component="section" sx={{ my: { xs: 6, md: 9 }, p: { xs: 4, md: 6 }, textAlign: "center" }}>
            <Typography variant="h4" component="h2" sx={{ fontWeight: 800 }}>
              Bring your practice onto one system.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2, maxWidth: 560, mx: "auto" }}>
              Sign in to {AORMS_STUDIO.title} or {AORMS_CONSULTANCY.title} — same platform,
              discipline-fit workspace.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "center", mt: 4 }}>
              <Button component={RouterLink} to="/login" variant="contained" size="large" endIcon={<ArrowForward />}>
                {AORMS_STUDIO.title}
              </Button>
              <Button
                component="a"
                href={AORMS_CONSULTANCY.appUrl}
                variant="outlined"
                size="large"
                endIcon={<ArrowForward />}
              >
                {AORMS_CONSULTANCY.title}
              </Button>
              <Button
                component="a"
                href={`mailto:${HUMAN_CENTRIC_WORKS.email}`}
                variant="text"
                size="large"
              >
                Talk to HCW
              </Button>
            </Stack>
          </Surface>

          {/* FAQ */}
          <Box id="faq" component="section" sx={{ py: { xs: 6, md: 9 } }}>
            <SectionHead eyebrow="Questions" title="What practices ask first" />
            <Stack divider={<Divider />} spacing={0}>
              {FAQ.map((item) => (
                <Box key={item.q} sx={{ py: 3 }}>
                  <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                    {item.q}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
                    {item.a}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Footer */}
          <Box component="footer" sx={{ pt: 6, mt: 4, borderTop: (t) => `1px solid ${t.palette.divider}` }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" } }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <AormsLogo variant="sm" />
                <Typography variant="caption" color="text.secondary">
                  {AORMS_PLATFORM.expansion}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {HUMAN_CENTRIC_WORKS.attribution} · {HUMAN_CENTRIC_WORKS.location} ·{" "}
                <Box component="a" href={`mailto:${HUMAN_CENTRIC_WORKS.email}`} sx={{ color: "inherit" }}>
                  {HUMAN_CENTRIC_WORKS.email}
                </Box>
              </Typography>
            </Stack>
          </Box>
        </Container>
      </GlassRail>

      <SectionDock links={SECTIONS} pathname={pathname} hash={hash} aria-label="Page sections" />
    </>
  );
}
