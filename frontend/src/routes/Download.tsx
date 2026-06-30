import { Download as DownloadIcon, Checkmark, Information } from "@carbon/icons-react";
import { Button, Column, Grid, Stack, Tag, Tile } from "@carbon/react";
import { MarketingFooter } from "../components/landing/MarketingFooter.js";
import { LandingBand, LandingEditorial } from "../components/landing/LandingBand.js";
import { MarketingShell } from "../components/landing/MarketingShell.js";
import { createAccountUrl } from "../lib/onboarding.js";

type Edition = {
  code: "LITE" | "CORE" | "ENTERPRISE";
  name: string;
  price: string;
  pitch: string;
  features: string[];
  tag: "green" | "blue" | "purple";
  needsKey: boolean;
  url?: string;
};

const EDITIONS: Edition[] = [
  {
    code: "LITE",
    name: "AORMS Lite",
    price: "Free",
    pitch:
      "The free desktop edition for solo architects and freelancers — your whole practice on your own machine, no GST billing, no subscription.",
    features: [
      "Up to 3 people",
      "Projects · tasks · drawings · clients",
      "Local-first — your data stays on your device",
      "No licence key required",
    ],
    tag: "green",
    needsKey: false,
    url: import.meta.env.VITE_LITE_DOWNLOAD_URL as string | undefined,
  },
  {
    code: "CORE",
    name: "AORMS Core",
    price: "Licensed",
    pitch:
      "The full studio edition for growing practices — the complete office OS with AI briefings and bring-your-own storage.",
    features: [
      "Up to 15 people",
      "AI office briefings · BYO storage",
      "Proposals · GST invoicing · portals",
      "Activate with your Core licence key",
    ],
    tag: "blue",
    needsKey: true,
    url: import.meta.env.VITE_CORE_DOWNLOAD_URL as string | undefined,
  },
  {
    code: "ENTERPRISE",
    name: "AORMS Enterprise",
    price: "Licensed",
    pitch:
      "Unlimited seats, self-hosting and bring-your-own AI keys — for multi-office practices that keep everything in-house.",
    features: [
      "Unlimited people",
      "Self-host · BYO AI API keys",
      "Everything in Core, unlimited",
      "Activate with your Enterprise licence key",
    ],
    tag: "purple",
    needsKey: true,
    url: import.meta.env.VITE_ENTERPRISE_DOWNLOAD_URL as string | undefined,
  },
];

export function Download() {
  return (
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
                practice — Lite is free; Core and Enterprise activate with a licence key.
              </p>
            </Stack>

            <Grid fullWidth className="esti-landing-grid">
              {EDITIONS.map((e) => (
                <Column key={e.code} lg={5} md={8} sm={4}>
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
                        <Button kind="tertiary" size="lg" renderIcon={Information} disabled>
                          Coming soon
                        </Button>
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
  );
}
