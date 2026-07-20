import { describe, expect, it } from "vitest";
import {
  derivePlaceOfSupply,
  gstStateCode,
  placeOfSupplyMismatch,
  stateFromGstin,
} from "./place-of-supply.js";

const KARNATAKA_FIRM = { firmState: "Karnataka", firmGstin: "29AABCS1234A1Z5" };

describe("derivePlaceOfSupply", () => {
  it("follows the SITE, not the client — IGST Act s.12(3)(a)", () => {
    // The case that was silently wrong: Karnataka firm, Karnataka client,
    // Tamil Nadu site. Recipient-address logic says intra-state; s.12(3) says
    // the supply is in Tamil Nadu, so IGST.
    const pos = derivePlaceOfSupply({
      ...KARNATAKA_FIRM,
      clientState: "Karnataka",
      projectState: "Tamil Nadu",
    });
    expect(pos).toEqual({ state: "Tamil Nadu", interState: true, basis: "SITE" });
  });

  it("is intra-state when the site is in the firm's own state, whatever the client's address", () => {
    const pos = derivePlaceOfSupply({
      ...KARNATAKA_FIRM,
      clientState: "Delhi",
      projectState: "Karnataka",
    });
    expect(pos).toEqual({ state: "Karnataka", interState: false, basis: "SITE" });
  });

  it("falls back to the client only when the project has no state, and says so", () => {
    const pos = derivePlaceOfSupply({ ...KARNATAKA_FIRM, clientState: "Kerala" });
    expect(pos).toEqual({ state: "Kerala", interState: true, basis: "CLIENT" });
  });

  it("reads the state from a GSTIN when the name is missing", () => {
    const pos = derivePlaceOfSupply({
      firmGstin: "29AABCS1234A1Z5",
      clientGstin: "33ABCDE1234F1Z5",
    });
    expect(pos.state).toBe("Tamil Nadu");
    expect(pos.interState).toBe(true);
  });

  it("reports UNKNOWN rather than guessing when there is nothing to go on", () => {
    const pos = derivePlaceOfSupply({ ...KARNATAKA_FIRM });
    expect(pos).toEqual({ state: null, interState: false, basis: "UNKNOWN" });
  });

  it("does not treat a missing firm state as intra-state", () => {
    const pos = derivePlaceOfSupply({ projectState: "Goa" });
    expect(pos.state).toBe("Goa");
    expect(pos.basis).toBe("SITE");
  });

  it("matches state names case-insensitively", () => {
    expect(
      derivePlaceOfSupply({ ...KARNATAKA_FIRM, projectState: "karnataka" }).interState,
    ).toBe(false);
  });
});

describe("placeOfSupplyMismatch", () => {
  const tnSite = derivePlaceOfSupply({ ...KARNATAKA_FIRM, projectState: "Tamil Nadu" });
  const kaSite = derivePlaceOfSupply({ ...KARNATAKA_FIRM, projectState: "Karnataka" });

  it("is silent when the choice agrees with the derivation", () => {
    expect(placeOfSupplyMismatch(tnSite, true)).toBeNull();
    expect(placeOfSupplyMismatch(kaSite, false)).toBeNull();
  });

  it("warns, naming the state and the basis, when they disagree", () => {
    expect(placeOfSupplyMismatch(tnSite, false)).toContain("Tamil Nadu");
    expect(placeOfSupplyMismatch(tnSite, false)).toContain("IGST");
    expect(placeOfSupplyMismatch(kaSite, true)).toContain("CGST + SGST");
  });

  it("never warns when nothing could be derived", () => {
    const unknown = derivePlaceOfSupply({ ...KARNATAKA_FIRM });
    expect(placeOfSupplyMismatch(unknown, true)).toBeNull();
    expect(placeOfSupplyMismatch(unknown, false)).toBeNull();
  });
});

describe("state codes", () => {
  it("maps names to GST codes and back", () => {
    expect(gstStateCode("Karnataka")).toBe("29");
    expect(gstStateCode("Tamil Nadu")).toBe("33");
    expect(gstStateCode("Nowhere")).toBeNull();
    expect(stateFromGstin("29AABCS1234A1Z5")).toBe("Karnataka");
    expect(stateFromGstin("")).toBeNull();
    expect(stateFromGstin("ZZAABCS1234A1Z5")).toBeNull();
  });
});
