import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { listEvents, loadReport } from "../server/lib/repro/reports.js";
import { requireScope } from "../server/lib/repro/scope.js";

export default defineAction({
  description: "List the audit events of one report (created, clip read, field set by agent or human, follow-ups, filed), oldest first.",
  schema: z.object({ id: z.string().describe("Report id") }),
  http: { method: "GET" },
  run: async ({ id }, ctx) => {
    const scope = requireScope(ctx);
    await loadReport(scope, id);
    return { events: await listEvents(scope, id) };
  },
});
