import DownloadIcon from "@mui/icons-material/Download";
import CheckIcon from "@mui/icons-material/Check";
import { Button, Chip, Stack } from "@mui/material";
import { MarketingFooter } from "../components/landing/MarketingFooter.js";
import { LandingBand, LandingEditorial } from "../components/landing/LandingBand.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { StatusDot } from "../components/StatusTag.js";
import { createAccountUrl } from "../lib/onboarding.js";
import { trpc } from "../lib/trpc.js";

// Build-time fallback if the live resolver has no estimate-v* release yet.
const ESTIMATE_URL_BAKED = import.meta.env.VITE_ESTIMATION_DOWNLOAD_URL as string | undefined;

const ESTIMATE_FEATURES = [
  "Measure once → derive linked quantities (brickwork → plaster → paint)",
  "Material take-off from recipes · Bar Bending Schedule per IS 456 / 2502",
  "Prices against the CPWD Schedule of Rates",
  "Exports a sealed .aormsest — import into any AORMS project",
  "Sign in with your AORMS account — no separate licence required",
  "Fully offline after login; your data stays on your machine",
];

export function Download() {
  const installersQ = trpc.marketing.desktopInstallers.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });
  const live = installersQ.data;
  const ESTIMATE_URL = live?.estimate ?? ESTIMATE_URL_BAKED;

  return (
    <MarketingShell>
      <LandingBand>
        <LandingEditorial>
          <Stack spacing={7}>
            {/* Page header */}
            <Stack spacing={4}>
              <StatusDot color="cool-gray" label="Windows desktop app" />
              <h1 className="esti-landing-section-title">AORMS Estimate</h1>
              <p>
                The standalone Windows estimating app. Free to download — sign in with your
                AORMS account, pick a project, measure once, and derive everything. Export a
                sealed <code>.aormsest</code> file and import it straight into your project's
                Cost Management in the browser.
              </p>
              <p>
                <strong>AORMS itself runs on the web</strong> — no desktop installation
                needed. Head to{" "}
                <a href={createAccountUrl()}>aorms.in</a> to create a free account and start
                your practice workspace today.
              </p>
              {live?.version && (
                <p className="esti-label--helper">
                  Latest release: {live.version}
                  {live.publishedAt
                    ? ` · ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
                        new Date(live.publishedAt),
                      )}`
                    : ""}
                </p>
              )}
            </Stack>

            {/* Estimate feature card */}
            <Stack spacing={5}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={3}>
                  <StatusDot color="teal" label="AORMS Estimate" />
                  <Chip label="Free · Offline · Sign-in required" variant="outlined" />
                </Stack>
                <Stack spacing={3}>
                  {ESTIMATE_FEATURES.map((f) => (
                    <Stack key={f} direction="row" spacing={3}>
                      <CheckIcon sx={{ fontSize: 16 }} aria-hidden />
                      <span>{f}</span>
                    </Stack>
                  ))}
                </Stack>
              </Stack>

              {ESTIMATE_URL ? (
                <Button variant="contained" size="large" endIcon={<DownloadIcon />} href={ESTIMATE_URL}>
                  Download AORMS Estimate
                </Button>
              ) : (
                <Stack spacing={3}>
                  <Button variant="outlined" size="large" disabled>
                    Estimate app coming soon
                  </Button>
                  <p className="esti-label--helper">
                    Write to <a href="mailto:hi@aorms.in">hi@aorms.in</a> to be notified when
                    the installer ships.
                  </p>
                </Stack>
              )}
            </Stack>

            <p className="esti-label--helper">
              Installer is code-signed for Windows 10/11. macOS and Linux builds are on the
              roadmap. An active AORMS account is required to launch Estimate — sign in once and
              work fully offline.
            </p>
          </Stack>
        </LandingEditorial>
      </LandingBand>
      <MarketingFooter />
    </MarketingShell>
  );
}
