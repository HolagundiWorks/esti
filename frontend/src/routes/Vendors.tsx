import { Column, Grid, Stack, Tag, Tile } from "@carbon/react";
import { PageHeader } from "../components/PageHeader.js";

/**
 * Third Parties › Vendors — material suppliers & vendor directory. Navigational
 * placeholder; the modules below are not built yet (see docs/esti/NAVIGATION.md).
 */
const PLANNED: { title: string; description: string }[] = [
  { title: "Vendor Directory", description: "Supplier database with categories and contacts." },
  { title: "Material Categories", description: "Material categories each vendor supplies." },
  { title: "Pricing History", description: "Historical rates per vendor / material." },
  { title: "Quotation Records", description: "Quotations received and comparisons." },
];

export function Vendors() {
  return (
    <Stack gap={6}>
      <PageHeader
        title="Vendors"
        description="Material suppliers and vendor directory for the practice."
      />
      <Tag type="purple">Coming soon — vendor modules in planning</Tag>
      <Grid narrow>
        {PLANNED.map((m) => (
          <Column key={m.title} lg={4} md={4} sm={4}>
            <Tile className="esti-fill">
              <Stack gap={3}>
                <h4>{m.title}</h4>
                <p className="esti-label esti-label--secondary">{m.description}</p>
                <Tag type="gray" size="sm">Planned</Tag>
              </Stack>
            </Tile>
          </Column>
        ))}
      </Grid>
    </Stack>
  );
}
