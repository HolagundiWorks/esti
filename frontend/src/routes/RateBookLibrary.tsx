import { RailLayout } from "../components/RailLayout.js";
import { RateBookManager } from "../components/estimation/RateBookManager.js";

/** Library › Rate Books — firm-defined item rates that price project estimates. */
export function RateBookLibrary() {
  return (
    <RailLayout title="Rate Books" description="Firm-defined item rates used to price project estimates (BOQ).">
      <RateBookManager />
    </RailLayout>
  );
}
