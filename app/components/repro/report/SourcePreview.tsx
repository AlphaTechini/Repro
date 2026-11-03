import type { ClipEvidence, FieldSource } from "@shared/repro/types";

import { FramePreview } from "../evidence/FramePreview";

/** Tooltip body for a SourceChip: the quoted evidence (UI-DESIGN §6.1). */
export function sourcePreview(
  reportId: string,
  evidence: ClipEvidence | null,
  source: FieldSource,
) {
  switch (source.kind) {
    case "transcript": {
      const at = source.atMs;
      const seg =
        at != null
          ? evidence?.transcript.find((s) => at >= s.startMs && at <= s.endMs)
          : undefined;
      const text = seg?.text ?? source.ref;
      return text ? <p className="text-xs">“{text}”</p> : null;
    }
    case "console": {
      const issue = evidence?.consoleIssues.find((c) => c.id === source.ref);
      const text = issue?.message ?? source.ref;
      return text ? <p className="font-mono text-2xs">{text}</p> : null;
    }
    case "network": {
      const r = evidence?.failedRequests.find((q) => q.id === source.ref);
      return r ? (
        <p className="font-mono text-2xs">
          {r.method} {r.path} → {r.status ?? "failed"}
        </p>
      ) : source.ref ? (
        <p className="font-mono text-2xs">{source.ref}</p>
      ) : null;
    }
    case "frame":
      return source.atMs != null ? (
        <FramePreview reportId={reportId} atMs={source.atMs} />
      ) : null;
    default:
      return source.ref ? <p className="text-xs">“{source.ref}”</p> : null;
  }
}
