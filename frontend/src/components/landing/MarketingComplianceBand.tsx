import { CodeSnippet, Stack, Tab, TabList, TabPanel, TabPanels, Tabs } from "@carbon/react";
import { ComplianceChecker } from "./ComplianceChecker.js";
import { MarketingBandSection } from "./MarketingBandSection.js";

const CURL_EXAMPLE = `curl -X POST https://your-aorms.in/api/compliance/check \\
  -H "Content-Type: application/json" \\
  -d '{
    "buildingType": "RESIDENTIAL",
    "developmentArea": "A",
    "siteAreaSqm": 200,
    "proposedHeightM": 9,
    "floorCount": 2,
    "front": { "abutsRoad": true, "roadWidthM": 9 },
    "rear": {}, "left": {}, "right": {}
  }'`;

const IFRAME_SNIPPET = `<iframe
  src="https://your-aorms.in/compliance-check"
  width="100%"
  height="680"
  frameborder="0"
  title="BBMP Compliance Checker"
></iframe>`;

const JS_SNIPPET = `const res = await fetch("https://your-aorms.in/api/compliance/check", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    buildingType: "RESIDENTIAL",
    developmentArea: "A",
    siteAreaSqm: 200,
    proposedHeightM: 9,
    floorCount: 2,
    front: { abutsRoad: true, roadWidthM: 9 },
    rear: {}, left: {}, right: {}
  })
});
const { result } = await res.json();
// result.farAllowed, result.permissibleBuiltup, result.setbacks …`;

export function MarketingComplianceBand() {
  return (
    <MarketingBandSection
      id="compliance-api"
      variant="muted"
      eyebrow="Open API"
      title="Free BBMP compliance check — embed it anywhere."
      lead="A public REST API for Bengaluru building regulations. No key, no login. Use it in your practice website, feasibility tool, or government portal."
    >
      <Stack gap={8}>
        <Tabs>
          <TabList aria-label="Compliance API options">
            <Tab>Try it live</Tab>
            <Tab>Embed (iframe)</Tab>
            <Tab>REST API</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <div style={{ paddingTop: "1.5rem" }}>
                <ComplianceChecker />
              </div>
            </TabPanel>
            <TabPanel>
              <Stack gap={5} style={{ paddingTop: "1.5rem" }}>
                <p>
                  Drop the iframe below on any webpage. No API key or account required.
                  Replace the hostname with your AORMS instance URL.
                </p>
                <CodeSnippet type="multi" feedback="Copied!">{IFRAME_SNIPPET}</CodeSnippet>
              </Stack>
            </TabPanel>
            <TabPanel>
              <Stack gap={5} style={{ paddingTop: "1.5rem" }}>
                <p>
                  <strong>POST /api/compliance/check</strong> — open CORS, no auth.
                  Returns FAR, coverage, setbacks, parking, and basement rules for any BBMP site.
                </p>
                <p className="esti-label esti-label--secondary">cURL</p>
                <CodeSnippet type="multi" feedback="Copied!">{CURL_EXAMPLE}</CodeSnippet>
                <p className="esti-label esti-label--secondary">JavaScript (fetch)</p>
                <CodeSnippet type="multi" feedback="Copied!">{JS_SNIPPET}</CodeSnippet>
                <p className="esti-label esti-label--helper">
                  Also: <strong>GET /api/compliance/authorities</strong> — list available rule sets.
                  Rate limit: 30 requests/minute per IP. Source: BBMP Bylaws 2003.
                </p>
              </Stack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>
    </MarketingBandSection>
  );
}
