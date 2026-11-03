import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { computeMetrics } from "../shared/repro/lib/metrics.js";
import type { Metrics, Report, ReportEvent } from "../shared/repro/types.js";
import { listEvents, listReports } from "../server/lib/repro/reports.js";
import { requireScope } from "../server/lib/repro/scope.js";

/** Upper bound on reports read for one metrics pass (keeps the query count bounded). */
const MAX_REPORTS = 500;
const EVENT_BATCH = 20;

async function loadEvents(scope: Parameters<typeof listEvents>[0], reports: Report[]): Promise<ReportEvent[]> {
  const events: ReportEvent[] = [];
  for (let i = 0; i < reports.length; i += EVENT_BATCH) {
    const batch = reports.slice(i, i + EVENT_BATCH);
    const lists = await Promise.all(batch.map((report) => listEvents(scope, report.id)));
    for (const list of lists) events.push(...list);
  }
  return events;
}

export default defineAction({
  description:
    "Get Repro metrics (PRD §3) for the caller's org: per report, time to fix-ready, follow-up questions, agent vs human fields and completeness at filing; plus totals. Reads up to 500 reports.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async (_args, ctx): Promise<Metrics> => {
    const scope = requireScope(ctx);
    const reports = await listReports(scope, { limit: MAX_REPORTS });
    const events = await loadEvents(scope, reports);
    return computeMetrics(reports, events, new Date());
  },
});
