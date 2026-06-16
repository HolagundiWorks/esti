/** iCalendar (ICS) helpers — workload feed for Google Calendar subscription. */

export type IcsEvent = {
  uid: string;
  /** All-day event date YYYY-MM-DD. */
  date: string;
  summary: string;
  description?: string;
};

export type WorkloadCalendarScope = "mine" | "office";

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcsDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

function nextDayIso(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Build a publish-style ICS document from task due-date events. */
export function buildIcsFeed(events: IcsEvent[], calName: string): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Holagundi Consulting Works//ESTI AORMS Workload//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calName)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${formatIcsDate(event.date)}`,
      `DTEND;VALUE=DATE:${formatIcsDate(nextDayIso(event.date))}`,
      `SUMMARY:${escapeIcsText(event.summary)}`,
    );
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

/** Google Calendar "Add by URL" accepts webcal:// or https:// subscription links. */
export function toWebcalUrl(httpsUrl: string): string {
  return httpsUrl.replace(/^https:\/\//i, "webcal://");
}
