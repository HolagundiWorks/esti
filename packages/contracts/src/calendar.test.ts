import { describe, expect, it } from "vitest";
import { buildIcsFeed, escapeIcsText, toWebcalUrl } from "./calendar.js";

describe("calendar ICS feed", () => {
  it("escapes special iCal characters", () => {
    expect(escapeIcsText("a;b,c\nx")).toBe("a\\;b\\,c\\nx");
  });

  it("builds a valid VCALENDAR with all-day events", () => {
    const ics = buildIcsFeed(
      [
        {
          uid: "task-1@aorms.in",
          date: "2026-06-20",
          summary: "[P-001] Site visit",
          description: "Priority: HIGH",
        },
      ],
      "ESTI Workload",
    );
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260620");
    expect(ics).toContain("DTEND;VALUE=DATE:20260621");
    expect(ics).toContain("SUMMARY:[P-001] Site visit");
  });

  it("converts https subscription URL to webcal", () => {
    expect(toWebcalUrl("https://aorms.in/calendar/workload/abc.ics")).toBe(
      "webcal://aorms.in/calendar/workload/abc.ics",
    );
  });
});
