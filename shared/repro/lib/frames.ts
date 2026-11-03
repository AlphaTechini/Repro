import type { ClipEvidence, FrameMarker } from "../types";

const KEYWORDS = /error|nothing|broken|spin|doesn'?t|won'?t|fail|crash|stuck/i;
const DEDUPE_MS = 1500;
const MAX_FRAMES = 4;

/** Pick 1–4 moments worth looking at. Deterministic. */
export function pickFrameTimestamps(
  evidence: Pick<ClipEvidence, "consoleIssues" | "failedRequests" | "transcript" | "durationMs">,
): FrameMarker[] {
  const cands: FrameMarker[] = [];
  const err = evidence.consoleIssues.find((i) => i.level === "error" && i.atMs !== null);
  if (err && err.atMs !== null) cands.push({ atMs: err.atMs, label: "First console error" });
  const req = evidence.failedRequests.find((r) => r.atMs !== null);
  if (req && req.atMs !== null) {
    cands.push({ atMs: req.atMs, label: `First failed request (${req.method} ${req.path})` });
  }
  for (const seg of evidence.transcript) {
    if (KEYWORDS.test(seg.text)) cands.push({ atMs: seg.startMs, label: "Reporter says: " + seg.text.trim().slice(0, 60) });
  }
  const out: FrameMarker[] = [];
  for (const c of cands) {
    const atMs = Math.max(0, Math.round(c.atMs));
    if (out.some((o) => Math.abs(o.atMs - atMs) < DEDUPE_MS)) continue;
    out.push({ atMs, label: c.label });
    if (out.length >= MAX_FRAMES) break;
  }
  if (out.length === 0) {
    const mid = Math.max(0, Math.round((evidence.durationMs ?? 0) / 2));
    out.push({ atMs: mid, label: "Midpoint of the clip" });
  }
  return out;
}
