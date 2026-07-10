import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { ItemLibraryManager } from "../components/knowledge/ItemLibraryManager.js";

/** Library › Standard items — versioned BOQ/measurement templates. */
export function ItemLibraryLibrary() {
  return (
    <RailLayout
      title="Standard items library"
      description="Office catalogue of measurement items — codes, chapters, UOM, and dimension rules for project abstract sheets."
    >
      <PageBreadcrumb
        items={[
          { label: "Library" },
          { label: "Standard items" },
        ]}
      />
      <ItemLibraryManager embedded />
    </RailLayout>
  );
}
