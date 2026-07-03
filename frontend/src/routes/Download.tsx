import { Download as DownloadIcon, Checkmark, Information } from "@carbon/icons-react";
import { Button, Column, Grid, Stack, Tag, Theme, Tile } from "@carbon/react";
import { MarketingFooter } from "../components/landing/MarketingFooter.js";
import { LandingBand, LandingEditorial } from "../components/landing/LandingBand.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { createAccountUrl } from "../lib/onboarding.js";

type Edition = {
  code: "LITE" | "PRO";
  name: string;
  price: string;
  pitch: string;
  features: string[];
  tag: "green" | "blue";
  needsKey: boolean;
  url?: string;
};

const EDITIONS: Edition[] = [
  {
    code: "LITE",
    name: "AORMS Lite",
    price: "Free",
    pitch:
      "The free desktop edition for small practices — your whole office on your own machine, no GST billing, no subscription, no dependencies to install.",
    features: [
      "Up to 3 staff · unlimited clients & projects",
      "Projects · tasks · drawings · clients",
      "Local-first — your data stays on your device",
      "No licence key required",
    ],
    tag: "green",
    needsKey: false,
    url: import.meta.env.VITE_LITE_DOWNLOAD_URL as string | undefined,
  },
  {
    code: "PRO",
    name: "AORMS Pro",
    price: "Licensed",
    pitch:
      "The full edition for growing and multi-office practices — the complete office OS with AI, GST, portals and unlimited seats, cloud-hosted or self-hosted.",
    features: [
      "Unlimited staff, storage, clients & projects",
      "AI Studio · GST invoicing · reconciliation · portals",
      "HR, payroll & performance · SSO · API · audit log",
      "Self-host · BYO AI keys · BYO storage · white-label",
      "Activate with your Pro licence key",
    ],
    tag: "blue",
    needsKey: true,
    url: import.meta.env.VITE_PRO_DOWNLOAD_URL as string | undefined,
  },
];

export function Download() {
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
                practice — Lite is free forever; Pro activates with a licence key.
              </p>
            </Stack>

            <Grid fullWidth className="esti-landing-grid">
              {EDITIONS.map((e) => (
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

                      {e.url ? (
                        <Button kind="primary" size="lg" renderIcon={DownloadIcon} href={e.url}>
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
              ))}
            </Grid>

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
