import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { recomputeCompleteness } from "../server/lib/repro/reports.js";
import { requireScope } from "../server/lib/repro/scope.js";

export default defineAction({
  description:
    "Deterministically check which required fields are still missing (no model involved), store the result and set status needs-info or ready. Returns percent and the missing field names. Ask the reporter only about missing fields, at most 3 questions in one message.",
  schema: z.object({ id: z.string().describe("Report id") }),
  http: { method: "POST" },
  run: async ({ id }, ctx) => {
    const report = await recomputeCompleteness(requireScope(ctx), id);
    return {
      percent: report.completeness,
      missing: report.missingFields,
      status: report.status,
      report: {
        id: report.id,
        title: report.title,
        status: report.status,
        severity: report.severity,
        followupCount: report.followupCount,
      },
      message:
        report.missingFields.length === 0
          ? "Report is complete (100%) and ready."
          : `Report is ${report.completeness}% complete. Missing: ${report.missingFields.join(", ")}.`,
    };
  },
});
