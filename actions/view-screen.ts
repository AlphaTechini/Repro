import { defineAction } from "@agent-native/core/action";
import { readAppState } from "@agent-native/core/application-state";
import { z } from "zod";

import { loadReport } from "../server/lib/repro/reports.js";
import { requireScope } from "../server/lib/repro/scope.js";

export default defineAction({
  description:
    "Read the app's current navigation state. Basic navigation is already included in <current-screen>; use this action when you need a fresh read. On a report page it also returns the visible report's key fields and what is still missing.",
  schema: z.object({}),
  http: false,
  readOnly: true,
  run: async (_args, ctx) => {
    const navigation = await readAppState("navigation");

    const screen: Record<string, unknown> = {};
    if (navigation) screen.navigation = navigation;

    const nav = navigation as { view?: string; reportId?: string } | null;
    if (nav?.view === "report" && nav.reportId) {
      try {
        const r = await loadReport(requireScope(ctx), nav.reportId);
        screen.report = {
          id: r.id,
          status: r.status,
          title: r.title,
          summary: r.summary,
          steps: r.steps,
          expected: r.expected,
          actual: r.actual,
          environment: r.environment,
          frequency: r.frequency,
          severity: r.severity,
          completeness: r.completeness,
          missingFields: r.missingFields,
          clipRead: r.clipReadAt != null,
          followupCount: r.followupCount,
          duplicateOfId: r.duplicateOfId,
          githubIssueNumber: r.githubIssueNumber,
          githubIssueUrl: r.githubIssueUrl,
        };
      } catch (err) {
        screen.reportError =
          err instanceof Error ? err.message : "Report could not be loaded.";
      }
    }

    if (Object.keys(screen).length === 0) {
      return "No application state found. Is the app running?";
    }
    return screen;
  },
});
