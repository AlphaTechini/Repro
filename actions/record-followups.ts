import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";
import { MAX_FOLLOWUPS } from "../shared/repro/types.js";
import { loadReport, logEvent, patchReport } from "../server/lib/repro/reports.js";
import { requireScope } from "../server/lib/repro/scope.js";
import { actorFromCtx } from "../server/lib/repro/actor.js";

export default defineAction({
  description:
    "Record the follow-up questions you are about to ask the reporter (1 to 3, once per report, max 3 in total). Call this right after asking them in chat. Sets status needs-info.",
  schema: z.object({
    id: z.string().describe("Report id"),
    questions: z.array(z.string()).min(1).max(3).describe("The questions asked, each short, about missing fields only."),
  }),
  http: { method: "POST" },
  run: async ({ id, questions }, ctx) => {
    const scope = requireScope(ctx);
    const report = await loadReport(scope, id);
    const qs = questions.map((q) => q.trim()).filter((q) => q.length > 0);
    if (qs.length === 0) {
      return fail("Provide at least one non-empty question.", { errorCode: "invalid_value", statusCode: 400 });
    }
    if (report.followupCount + qs.length > MAX_FOLLOWUPS) {
      return fail(
        `Follow-up limit reached: ${report.followupCount} of ${MAX_FOLLOWUPS} questions already asked. Do not ask more; use what you have or let the reporter fill the form.`,
        { errorCode: "followup_limit", statusCode: 409 },
      );
    }
    const keepStatus = report.status === "filed" || report.status === "duplicate";
    const updated = await patchReport(scope, id, {
      followupQuestions: [...report.followupQuestions, ...qs],
      followupCount: report.followupCount + qs.length,
      ...(keepStatus ? {} : { status: "needs-info" as const }),
    });
    const actor = actorFromCtx(ctx);
    for (const q of qs) await logEvent(scope, { reportId: id, actor, kind: "followup_asked", detail: q });
    return {
      followupCount: updated.followupCount,
      remaining: MAX_FOLLOWUPS - updated.followupCount,
      status: updated.status,
      message: `Recorded ${qs.length} question(s). ${MAX_FOLLOWUPS - updated.followupCount} follow-up(s) remain.`,
    };
  },
});
