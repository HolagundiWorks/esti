import { Download as DownloadIcon, Checkmark, Information } from "@carbon/icons-react";
import { Button, Column, Grid, Stack, Tag, Theme, Tile } from "@carbon/react";
import { MarketingFooter } from "../components/landing/MarketingFooter.js";
import { LandingBand, LandingEditorial } from "../components/landing/LandingBand.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { createAccountUrl } from "../lib/onboarding.js";
import { trpc } from "../lib/trpc.js";

type Edition = {
  code: "LITE" | "PRO";
  name: string;
  price: string;
  pitch: string;
  features: string[];
  tag: "green" | "blue";
  needsKey: boolean;
};

const EDITIONS: Edition[] = [
  {
    code: "LITE",
    name: "AORMS Lite",
    price: "Free · Offline",
    pitch:
      "The free, standalone, offline desktop app for small practices — your whole office on your own machine and local network. No licence, no cloud, no subscription, and everything it needs ships inside the installer.",
    features: [
      "1 admin + 3 staff/intern · unlimited projects & contacts",
      "Projects · tasks · drawings · proposals · invoices · contacts",
      "Runs on your local network — teammates connect from their own devices",
      "Fully offline — Postgres is bundled, your data never leaves your machine",
      "Share any PDF over WhatsApp · backup-code recovery",
      "No licence key required — upgrade to Pro whenever you're ready",
    ],
    tag: "green",
    needsKey: false,
  },
  {
    code: "PRO",
    name: "AORMS Pro",
    price: "Licensed",
    pitch:
      "The full edition for growing and multi-office practices — the complete office OS with AI, GST, portals and unlimited seats, cloud-hosted or self-hosted.",
    features: [
      "Unlimited staff, clients & projects",
      "10 GB cloud storage, mirrored to desktop · buy add-on storage",
      "AI Studio (LLM/RAG run locally, fetch cloud data) · GST · portals",
      "HR, payroll & performance · SSO · API · audit log",
      "Self-host · BYO AI keys · white-label (BYO storage on Enterprise)",
      "Activate with your Pro licence key",
    ],
    tag: "blue",
    needsKey: true,
  },
];

// Baked build-time fallbacks (deploy/fetch-installers.sh) if the live resolver is unavailable.
const BAKED: Record<Edition["code"], string | undefined> = {
  LITE: (import.meta.env.VITE_COMMUNITY_DOWNLOAD_URL ??
    import.meta.env.VITE_LITE_DOWNLOAD_URL) as string | undefined,
  PRO: import.meta.env.VITE_PRO_DOWNLOAD_URL as string | undefined,
};

// The standalone estimating companion (separate Windows binary).
const ESTIMATE_URL = import.meta.env.VITE_ESTIMATION_DOWNLOAD_URL as string | undefined;
const ESTIMATE_FEATURES = [
  "Measure once → derive linked quantities (brickwork → plaster → paint)",
  "Material take-off from recipes · Bar Bending Schedule against IS 456 / 2502",
  "Prices against the CPWD Schedule of Rates",
  "Exports a sealed .aormsest — import into any project's Cost Management",
  "Fully offline; free companion to any AORMS edition",
];

export function Download() {
  // Live: the newest desktop release's installers, pulled from GitHub (cached server-side).
  const installersQ = trpc.marketing.desktopInstallers.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });
  const live = installersQ.data;
  const urlFor = (code: Edition["code"]): string | undefined =>
    (code === "LITE" ? live?.lite : live?.pro) ?? BAKED[code];

  return (
    <Theme theme="g100">
      <MarketingShell>
        <LandingBand>
          <LandingEditorial>
            <Stack gap={7}>
            <Stack gap={4}>
              <Tag type="cool-gray" size="md">
                Windows desktop app
              </Tag>
              <h1 className="esti-landing-section-title">Download AORMS</h1>
              <p>
                Run the whole office on your own machine. Pick the edition that matches your
                practice — Lite is free forever and fully offline; Pro activates with a licence
                key and adds AI, GST, portals and the cloud.
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

            <Grid fullWidth className="esti-landing-grid">
              {EDITIONS.map((e) => {
                const url = urlFor(e.code);
                return (
                <Column key={e.code} lg={8} md={4} sm={4}>
                  <Tile className="esti-fill">
                    <Stack gap={5}>
                      <Stack gap={3}>
                        <Stack orientation="horizontal" gap={3}>
                          <Tag type={e.tag} size="md">
                            {e.name}
                          </Tag>
                          <Tag type="outline" size="md">
                            {e.price}
                          </Tag>
                        </Stack>
                        <p>{e.pitch}</p>
                      </Stack>

                      <Stack gap={3}>
                        {e.features.map((f) => (
                          <Stack key={f} orientation="horizontal" gap={3}>
                            <Checkmark size={16} aria-hidden />
                            <span>{f}</span>
                          </Stack>
                        ))}
                      </Stack>

                      {url ? (
                        <Button kind="primary" size="lg" renderIcon={DownloadIcon} href={url}>
                          Download {e.name}
                        </Button>
                      ) : (
                        <Stack gap={3}>
                          <Button kind="tertiary" size="lg" renderIcon={Information} disabled>
                            Desktop installer coming soon
                          </Button>
                          <p className="esti-label--helper">
                            Use {e.name} on the web today — {""}
                            {e.code === "LITE" ? (
                              <a href={createAccountUrl()}>create a free account</a>
                            ) : (
                              <a href="/login">sign in to your workspace</a>
                            )}
                            , or write to <a href="mailto:hi@aorms.in">hi@aorms.in</a> to be
                            notified when the installer ships.
                          </p>
                        </Stack>
                      )}

                      {e.needsKey && (
                        <p className="esti-label--helper">
                          Need a key? <a href={createAccountUrl()}>Create an account</a> or
                          contact <a href="mailto:hi@aorms.in">hi@aorms.in</a>.
                        </p>
                      )}
                    </Stack>
                  </Tile>
                </Column>
                );
              })}
            </Grid>

            {/* Standalone estimating companion */}
            <Tile className="esti-fill">
              <Stack gap={5}>
                <Stack gap={3}>
                  <Stack orientation="horizontal" gap={3}>
                    <Tag type="teal" size="md">AORMS Estimate</Tag>
                    <Tag type="outline" size="md">Free · Offline companion</Tag>
                  </Stack>
                  <h2 className="esti-landing-section-title">The estimating companion</h2>
                  <p>
                    Measure once, derive everything. The standalone Windows app for detailed
                    estimating — enter a single measurement and it derives the aligned quantities,
                    takes off materials, and builds the Bar Bending Schedule. It exports a sealed{" "}
                    <code>.aormsest</code> you import into any AORMS project under{" "}
                    <strong>Cost Management</strong>.
                  </p>
                </Stack>
                <Stack gap={3}>
                  {ESTIMATE_FEATURES.map((f) => (
                    <Stack key={f} orientation="horizontal" gap={3}>
                      <Checkmark size={16} aria-hidden />
                      <span>{f}</span>
                    </Stack>
                  ))}
                </Stack>
                {ESTIMATE_URL ? (
                  <Button kind="primary" size="lg" renderIcon={DownloadIcon} href={ESTIMATE_URL}>
                    Download AORMS Estimate
                  </Button>
                ) : (
                  <Stack gap={3}>
                    <Button kind="tertiary" size="lg" renderIcon={Information} disabled>
                      Estimate app coming soon
                    </Button>
                    <p className="esti-label--helper">
                      Write to <a href="mailto:hi@aorms.in">hi@aorms.in</a> to be notified when the
                      installer ships. Import/re-cost of <code>.aormsest</code> files works in AORMS
                      today.
                    </p>
                  </Stack>
                )}
              </Stack>
            </Tile>

            <p className="esti-label--helper">
              Installers are code-signed for Windows 10/11. macOS and Linux builds are on the
              roadmap. Building from source? See the project README.
            </p>
          </Stack>
        </LandingEditorial>
        </LandingBand>
        <MarketingFooter />
      </MarketingShell>
    </Theme>
  );
}
