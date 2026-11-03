import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { loadReport } from "../server/lib/repro/reports.js";
import { requireScope } from "../server/lib/repro/scope.js";

export default defineAction({
  description:
    "Get one bug report: fields, per-field sources, evidence, completeness, missing fields and status.",
  schema: z.object({ id: z.string().describe("Report id, e.g. rep_abc123") }),
  http: { method: "GET" },
  run: async ({ id }, ctx) => {
    const report = await loadReport(requireScope(ctx), id);
    return { report };
  },
});
