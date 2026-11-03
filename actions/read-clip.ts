import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { parseAgentContext, parseAgentTranscript } from "../shared/repro/lib/clips-parse.js";
import { parseClipsUrl } from "../shared/repro/lib/clips-url.js";
import { computeErrorSignature } from "../shared/repro/lib/error-signature.js";
import { pickFrameTimestamps } from "../shared/repro/lib/frames.js";
import { clipLinkAt, formatClipTime } from "../shared/repro/lib/time.js";
import type { ClipEvidence } from "../shared/repro/types.js";
import { actorFromCtx } from "../server/lib/repro/actor.js";
import { fetchAgentContext, fetchAgentTranscript } from "../server/lib/repro/clips-client.js";
import { loadReport, logEvent, patchReport } from "../server/lib/repro/reports.js";
import { requireScope } from "../server/lib/repro/scope.js";

const t = (ms: number | null) => (ms === null ? "?" : (ms < 0 ? "-" : "") + formatClipTime(Math.abs(ms)));
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export default defineAction({
  description:
    "Read the report's Clip (transcript, console issues, failed network requests) and store it as evidence on the report. Returns a compact summary with m:ss timestamps and 1-4 suggested frame moments. Call this first for a new report; safe to call again to retry. Then use get-clip-frame on the frame markers and update-report-fields with sources.",
  schema: z.object({ id: z.string().describe("Report id") }),
  http: { method: "POST" },
  maxResultChars: 30000,
  run: async ({ id }, ctx) => {
    const scope = requireScope(ctx);
    const report = await loadReport(scope, id);
    const ref = parseClipsUrl(report.clipUrl);
    const ctxJson = await fetchAgentContext(ref);
    const evidence: ClipEvidence = parseAgentContext(ctxJson);

    // Context already carries transcript segments; fetch the dedicated endpoint only when they are missing.
    if (evidence.transcript.length === 0 && evidence.transcriptStatus !== "failed" && evidence.transcriptStatus !== "none") {
      const tj = await fetchAgentTranscript(ref);
      if (tj) {
        const parsed = parseAgentTranscript(tj);
        evidence.transcript = parsed.segments;
        evidence.transcriptStatus = parsed.segments.length > 0 ? "ready" : parsed.status;
      } else {
        evidence.transcriptStatus = "unavailable";
      }
    }
    evidence.frames = pickFrameTimestamps(evidence);
    const errorSignature = computeErrorSignature(evidence);
    const now = new Date().toISOString();
    await patchReport(scope, id, { evidence, errorSignature, clipReadAt: now });
    const a = actorFromCtx(ctx);
    await logEvent(scope, {
      reportId: id,
      actor: a === "human" ? "system" : "agent",
      kind: "clip_read",
      detail: `${evidence.consoleIssues.length} console, ${evidence.failedRequests.length} network, ${evidence.transcript.length} transcript, transcript ${evidence.transcriptStatus}`,
    });

    const errors = evidence.consoleIssues.filter((i) => i.level === "error");
    const summary = {
      title: evidence.title ?? null,
      durationMs: evidence.durationMs ?? null,
      pageUrl: evidence.pageUrl ?? null,
      userAgent: evidence.userAgent ?? null,
      transcriptStatus: evidence.transcriptStatus,
      hasDiagnostics: evidence.hasDiagnostics,
      counts: {
        transcriptSegments: evidence.transcript.length,
        consoleIssues: evidence.consoleIssues.length,
        consoleErrors: errors.length,
        failedRequests: evidence.failedRequests.length,
      },
      errorSignature,
      firstConsoleErrors: errors.slice(0, 5).map((i) => ({ at: t(i.atMs), atMs: i.atMs, message: clip(i.message, 300) })),
      failedRequests: evidence.failedRequests.slice(0, 5).map((r) => ({
        at: t(r.atMs),
        atMs: r.atMs,
        request: `${r.method} ${r.path} ${r.status ?? r.error ?? "failed"}`,
      })),
      transcript: evidence.transcript.slice(0, 40).map((s) => ({ at: t(s.startMs), atMs: s.startMs, text: clip(s.text, 240) })),
      frameMarkers: evidence.frames.map((f) => ({ at: t(f.atMs), atMs: f.atMs, label: f.label })),
      clipLinkAtFirstFrame: clipLinkAt(`${ref.origin}/share/${ref.recordingId}`, evidence.frames[0]?.atMs ?? 0),
    };
    const notes: string[] = [];
    if (!evidence.hasDiagnostics) notes.push("No browser diagnostics: the clip was not recorded with the Clips extension, so there are no console or network entries.");
    if (evidence.transcriptStatus !== "ready") notes.push(`Transcript is ${evidence.transcriptStatus}; rely on frames and diagnostics and tell the reporter.`);
    return {
      summary,
      evidence: { ...evidence, transcript: evidence.transcript.slice(0, 60) },
      message: `Read clip for ${id}. ${notes.join(" ")} Next: look at the frame markers with get-clip-frame, then update-report-fields with a source per field.`.trim(),
    };
  },
});
