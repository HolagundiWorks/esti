import { RailLayout } from "../components/RailLayout.js";
import { SpecCatalogManager } from "../components/knowledge/SpecCatalogManager.js";

/** Library › Specification catalogue — versioned finish/material spec sheets. */
export function SpecCatalogLibrary() {
  return (
    <RailLayout
      title="Specification catalogue"
      description="Versioned specification sheets for project spec documents — categories, items, make, and finish."
    >
      <SpecCatalogManager embedded />
    </RailLayout>
  );
}
