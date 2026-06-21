import { Column, Grid, Stack, Theme } from "@carbon/react";
import { useEffect } from "react";
import { ComplianceChecker } from "../components/landing/ComplianceChecker.js";

const SEO = {
  title: "Building Compliance Checker — FAR, Setbacks & Parking | BBMP, GHMC, CMDA, DDA, UDCPR",
  description:
    "Free BBMP building compliance checker for Bengaluru. Compute FAR, ground coverage, setbacks, parking ECS, and basement rules under BBMP Bye-Laws 2003. " +
    "Reference data for Mumbai (UDCPR), Delhi (DDA/MPD), Chennai (CMDA), Hyderabad (GHMC), Pune, Kolkata (KMC), Ahmedabad (GDCR). No login required.",
  keywords:
    "BBMP compliance check, FAR calculator Bengaluru, FSI calculator India, setback calculator, GHMC building rules, DDA FAR, CMDA FSI Chennai, UDCPR Mumbai, KMC Kolkata, GDCR Ahmedabad, building bylaw checker India, ground coverage India",
  canonical: "https://aorms.in/compliance-check",
} as const;

/**
 * Standalone BBMP compliance calculator — no auth, no app shell.
 * Served at /compliance-check; embeddable as an iframe:
 *   <iframe src="https://your-aorms.in/compliance-check" width="100%" height="700"></iframe>
 */
export function ComplianceWidget() {
  useEffect(() => {
    document.title = SEO.title;
    const setMeta = (sel: string, val: string) => {
      document.querySelector(sel)?.setAttribute("content", val);
    };
    setMeta('meta[name="description"]', SEO.description);
    setMeta('meta[name="keywords"]', SEO.keywords);
    setMeta('meta[property="og:title"]', SEO.title);
    setMeta('meta[property="og:description"]', SEO.description);
    setMeta('meta[name="twitter:title"]', SEO.title);
    setMeta('meta[name="twitter:description"]', SEO.description);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", SEO.canonical);
    return () => {
      // Restore title when navigating away
      document.title = "ESTI AORMS — Architectural Office Record for Indian Practices";
    };
  }, []);

  return (
    <Theme theme="white">
      <div style={{ minHeight: "100vh", background: "var(--cds-background)" }}>
        <Grid condensed style={{ padding: "2rem 0" }}>
          <Column sm={4} md={8} lg={16}>
            <Stack gap={7}>
              <div>
                <p className="esti-label esti-label--secondary">
                  BBMP 2003 · UDCPR · GHMC · DDA · CMDA · KMC · GDCR
                </p>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0.25rem 0 0.5rem" }}>
                  Building Compliance Check
                </h1>
                <p className="esti-label esti-label--helper">
                  Pre-construction development envelope — FAR, setbacks, coverage, and parking.
                  Full compute for Bengaluru (BBMP); DCR reference tables for Mumbai, Delhi,
                  Chennai, Hyderabad, Pune, Kolkata, Ahmedabad.{" "}
                  <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--cds-link-primary)" }}
                  >
                    AORMS
                  </a>{" "}
                  · Free API by Holagundi Consulting Works.
                </p>
              </div>
              <ComplianceChecker />
            </Stack>
          </Column>
        </Grid>
      </div>
    </Theme>
  );
}
