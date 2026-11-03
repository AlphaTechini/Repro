import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";
import { validateChanges } from "../shared/repro/lib/validate-changes.js";
import type { FieldProvenance, ReportField } from "../shared/repro/types.js";
import { actorFromCtx } from "../server/lib/repro/actor.js";
import {
  loadReport,
  logEvent,
  patchReport,
  recomputeCompleteness,
  type ReportPatch,
} from "../server/lib/repro/reports.js";
import { requireScope } from "../server/lib/repro/scope.js";

const sourceSchema = z.object({
  kind: z.enum(["transcript", "console", "network", "frame", "reporter"]).describe("Where the value came from."),
  atMs: z.number().optional().describe("Offset into the Clip in ms (from the transcript line, console entry, request or frame)."),
  ref: z.string().optional().describe("Quoted text or diagnostic entry id the value came from."),
});

export default defineAction({
  description:
    "Set report fields (title, summary, steps, expected, actual, environment, frequency, severity). As the agent you MUST give each change a source {kind, atMs?, ref?} citing the transcript, console, network, frame, or the reporter's own words; changes without a source are rejected. Never guess expected behaviour or frequency: ask the reporter. Re-runs the completeness check and returns percent and missing fields.",
  schema: z.object({
    id: z.string().describe("Report id"),
    changes: z
      .array(
        z.object({
          field: z
            .enum(["title", "summary", "steps", "expected", "actual", "environment", "frequency", "severity"])
            .describe("Field to set."),
          value: z
            .union([z.string(), z.array(z.string()), z.null()])
            .describe("New value. steps is an array of strings; severity: low|medium|high|critical; frequency: always|often|sometimes|once. Empty string clears."),
          source: sourceSchema.optional().describe("Required when you are the agent."),
        }),
      )
      .min(1)
      .describe("Fields to change."),
  }),
  http: { method: "POST" },
  run: async ({ id, changes }, ctx) => {
    const scope = requireScope(ctx);
    const actor = actorFromCtx(ctx);
    const report = await loadReport(scope, id);
    const checked = validateChanges(
      changes.map((c) => ({ field: c.field as ReportField, value: c.value, source: c.source })),
      actor,
    );
    if (!checked.ok) {
      return fail(checked.message, {
        errorCode: checked.errorCode,
        statusCode: 400,
      });
    }
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {};
    const fieldSources = { ...report.fieldSources };
    const changed: ReportField[] = [];
    for (const c of checked.changes) {
      const current = report[c.field];
      if (JSON.stringify(current ?? null) === JSON.stringify(c.value)) continue;
      patch[c.field] = c.value;
      fieldSources[c.field] = { ...c.provenance, at: now } as FieldProvenance;
      changed.push(c.field);
    }
    if (changed.length > 0) {
      await patchReport(scope, id, { ...(patch as ReportPatch), fieldSources });
      for (const field of changed) {
        await logEvent(scope, { reportId: id, actor, kind: "field_set", field });
      }
    }
    const updated = await recomputeCompleteness(scope, id);
    return {
      report: updated,
      percent: updated.completeness,
      missing: updated.missingFields,
      changed,
      message:
        changed.length === 0
          ? "No changes: values were already set."
          : `Updated ${changed.join(", ")}. Report is ${updated.completeness}% complete${updated.missingFields.length ? `; missing: ${updated.missingFields.join(", ")}` : ""}.`,
    };
  },
});
