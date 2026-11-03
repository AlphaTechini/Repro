import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { listReports, toListItem } from "../server/lib/repro/reports.js";
import { requireScope } from "../server/lib/repro/scope.js";

export default defineAction({
  description: "List bug reports in this workspace, newest first, with status, severity and completeness.",
  schema: z.object({
    status: z
      .enum(["draft", "needs-info", "ready", "filed", "duplicate"])
      .optional()
      .describe("Only reports with this status."),
    limit: z.coerce.number().int().min(1).max(500).optional().describe("Max reports to return (default 100)."),
  }),
  http: { method: "GET" },
  run: async ({ status, limit }, ctx) => {
    const reports = await listReports(requireScope(ctx), {
      ...(status ? { status } : {}),
      ...(limit ? { limit } : {}),
    });
    return { reports: reports.map(toListItem) };
  },
});
