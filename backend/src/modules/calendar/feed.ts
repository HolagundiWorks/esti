import type { FastifyInstance } from "fastify";
import { db } from "../../db/index.js";
import {
  buildWorkloadIcs,
  parseCalendarScope,
  userForCalendarToken,
} from "../../lib/workloadCalendar.js";

/** Public iCal feed — authenticated by per-user secret token in the URL. */
export function registerCalendarFeed(app: FastifyInstance): void {
  app.get<{ Params: { token: string }; Querystring: { scope?: string } }>(
    "/calendar/workload/:token",
    {
      config: { rateLimit: { max: 120, timeWindow: "1 minute" } },
    },
    async (req, reply) => {
      const raw = req.params.token.replace(/\.ics$/i, "");
      const user = await userForCalendarToken(db, raw);
      if (!user) {
        return reply.code(404).send("Not found");
      }

      const scope = parseCalendarScope(req.query.scope);
      try {
        const body = await buildWorkloadIcs(
          db,
          user.id,
          user.role,
          user.fullName,
          scope,
        );
        return reply
          .header("Content-Type", "text/calendar; charset=utf-8")
          .header("Cache-Control", "private, max-age=300")
          .send(body);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Forbidden";
        if (message.includes("Partner")) {
          return reply.code(403).send("Office scope not permitted for this account.");
        }
        throw err;
      }
    },
  );
}
