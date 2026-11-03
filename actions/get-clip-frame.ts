import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { parseClipsUrl } from "../shared/repro/lib/clips-url.js";
import { fetchClipFrame } from "../server/lib/repro/clips-client.js";
import { loadReport } from "../server/lib/repro/reports.js";
import { requireScope } from "../server/lib/repro/scope.js";

export default defineAction({
  description:
    "Look at one frame of the report's Clip at a timestamp (ms from the start). You receive the image; use it to confirm what the screen shows (error banners, empty states, button labels) before citing it as a source of kind \"frame\".",
  schema: z.object({
    id: z.string().describe("Report id"),
    atMs: z.coerce.number().int().min(0).describe("Offset into the Clip in milliseconds (use the frame markers from read-clip)."),
  }),
  http: { method: "GET" },
  maxResultChars: 2000,
  run: async ({ id, atMs }, ctx) => {
    const report = await loadReport(requireScope(ctx), id);
    const ref = parseClipsUrl(report.clipUrl);
    const frame = await fetchClipFrame(ref, atMs);
    const b64 = Buffer.from(frame.bytes).toString("base64");
    if (ctx?.caller === "frontend" || ctx?.caller === "http") {
      return { atMs: frame.resolvedAtMs, dataUrl: `data:${frame.mediaType};base64,${b64}` };
    }
    return {
      atMs: frame.resolvedAtMs,
      message: `Frame at ${frame.resolvedAtMs}ms attached.`,
      _agentImages: [
        { data: b64, mediaType: frame.mediaType, label: `frame ${frame.resolvedAtMs}ms` },
      ],
    };
  },
});
