import { describe, expect, it } from "vitest";
import {
  canAcknowledgeTransmittal,
  isTransmittalAcknowledged,
  TransmittalAcknowledge,
} from "./transmittal.js";

describe("transmittal acknowledgment", () => {
  it("isTransmittalAcknowledged is true only when stamped", () => {
    expect(isTransmittalAcknowledged({ acknowledgedAt: null })).toBe(false);
    expect(isTransmittalAcknowledged({ acknowledgedAt: undefined })).toBe(false);
    expect(isTransmittalAcknowledged({ acknowledgedAt: new Date() })).toBe(true);
    expect(isTransmittalAcknowledged({ acknowledgedAt: "2026-07-21T10:00:00Z" })).toBe(true);
  });

  it("canAcknowledgeTransmittal requires issued + not yet acked", () => {
    expect(
      canAcknowledgeTransmittal({ dateIssued: null, acknowledgedAt: null }),
    ).toEqual({ ok: false, reason: "Only issued transmittals can be acknowledged." });
    expect(
      canAcknowledgeTransmittal({
        dateIssued: "2026-07-21",
        acknowledgedAt: "2026-07-22T00:00:00Z",
      }),
    ).toEqual({ ok: false, reason: "This transmittal is already acknowledged." });
    expect(
      canAcknowledgeTransmittal({ dateIssued: "2026-07-21", acknowledgedAt: null }),
    ).toEqual({ ok: true });
  });

  it("TransmittalAcknowledge validates receiver name", () => {
    expect(() =>
      TransmittalAcknowledge.parse({ id: "00000000-0000-4000-8000-000000000001", acknowledgedBy: "" }),
    ).toThrow();
    expect(
      TransmittalAcknowledge.parse({
        id: "00000000-0000-4000-8000-000000000001",
        acknowledgedBy: "Acme Client",
        note: "Received via portal",
      }),
    ).toMatchObject({ acknowledgedBy: "Acme Client" });
  });
});
