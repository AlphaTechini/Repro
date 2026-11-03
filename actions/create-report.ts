import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";
import { ClipsUrlError, parseClipsUrl } from "../shared/repro/lib/clips-url.js";
import { insertReport, logEvent, newId } from "../server/lib/repro/reports.js";
import { requireScope } from "../server/lib/repro/scope.js";

export default defineAction({
  description:
    "Create a draft bug report from a Clips share link (https://<host>/share/<id>). Validates the link and returns the new report id. Next step: call read-clip with that id to read the recording.",
  schema: z.object({
    clipUrl: z
      .string()
      .describe("Clips share link, e.g. https://clips.agent-native.com/share/abc123 (optionally with ?agent_access=<token>)."),
  }),
  http: { method: "POST" },
  run: async ({ clipUrl }, ctx) => {
    const scope = requireScope(ctx);
    let parsed;
    try {
      parsed = parseClipsUrl(clipUrl);
    } catch (err) {
      if (err instanceof ClipsUrlError) {
        return fail(err.message, { errorCode: "invalid_clip_url", statusCode: 400 });
      }
      throw err;
    }
    const id = newId("rep");
    const report = await insertReport(scope, {
      id,
      clipUrl: parsed.shareUrl,
      recordingId: parsed.recordingId,
      clipOrigin: parsed.origin,
      agentThreadId: `repro-${id}`,
    });
    await logEvent(scope, { reportId: id, actor: "system", kind: "report_created", detail: parsed.recordingId });
    return {
      id,
      report,
      agentThreadId: report.agentThreadId,
      message: `Created draft report ${id}. Call read-clip with id "${id}" next.`,
    };
  },
});
