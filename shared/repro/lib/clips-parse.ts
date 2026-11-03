import type {
  ClipEvidence,
  ConsoleIssue,
  FailedRequest,
  TranscriptSegment,
  TranscriptStatus,
} from "../types";
import { pathOf } from "./error-signature";

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const LEVELS = ["error", "warn", "info", "log", "debug"] as const;

export function mapTranscriptStatus(raw: unknown): TranscriptStatus {
  switch (raw) {
    case "ready":
      return "ready";
    case "pending":
    case "streaming":
      return "pending";
    case "failed":
      return "failed";
    case "missing":
    case "none":
      return "none";
    default:
      return "unavailable";
  }
}

/** Segments live at `.transcript.segments` (§16); a top-level `.segments` is tolerated. */
export function parseTranscriptSegments(json: unknown): TranscriptSegment[] {
  if (!isObj(json)) return [];
  const t = json.transcript;
  const list = isObj(t) && Array.isArray(t.segments) ? t.segments : Array.isArray(json.segments) ? json.segments : [];
  const out: TranscriptSegment[] = [];
  for (const s of list) {
    if (!isObj(s)) continue;
    const text = str(s.text);
    const startMs = num(s.startMs);
    if (!text || startMs === null) continue;
    out.push({ startMs, endMs: num(s.endMs) ?? startMs, text: text.trim() });
  }
  return out;
}

export function parseTranscriptStatus(json: unknown): TranscriptStatus {
  if (!isObj(json)) return "unavailable";
  const t = json.transcript;
  if (isObj(t) && "status" in t) return mapTranscriptStatus(t.status);
  if (Array.isArray(json.segments) && json.segments.length > 0) return "ready";
  return "unavailable";
}

function parseConsole(list: unknown, prefix: string): ConsoleIssue[] {
  if (!Array.isArray(list)) return [];
  const out: ConsoleIssue[] = [];
  list.forEach((e, i) => {
    if (!isObj(e)) return;
    const message = str(e.message);
    if (!message) return;
    const level = (LEVELS as readonly unknown[]).includes(e.level) ? (e.level as ConsoleIssue["level"]) : "log";
    out.push({ id: `${prefix}-${i}`, level, message, atMs: num(e.timestampMs) });
  });
  return out;
}

function parseFailed(list: unknown): FailedRequest[] {
  if (!Array.isArray(list)) return [];
  const out: FailedRequest[] = [];
  list.forEach((e, i) => {
    if (!isObj(e)) return;
    const url = str(e.url);
    if (!url) return;
    const req: FailedRequest = {
      id: `net-${i}`,
      method: (str(e.method) ?? "GET").toUpperCase(),
      url,
      path: pathOf(url),
      status: num(e.status),
      atMs: num(e.timestampMs),
    };
    const error = str(e.error);
    if (error) req.error = error;
    const durationMs = num(e.durationMs);
    if (durationMs !== null) req.durationMs = durationMs;
    out.push(req);
  });
  return out;
}

/**
 * Map agent-context.json to evidence. Frames and errorSignature are computed by
 * the caller. Missing diagnostics => hasDiagnostics false with empty arrays.
 */
export function parseAgentContext(json: unknown): ClipEvidence {
  const root = isObj(json) ? json : {};
  const clip = isObj(root.clip) ? root.clip : {};
  const diag = isObj(root.browserDiagnostics) ? root.browserDiagnostics : null;
  const bug = isObj(root.bugReport) ? root.bugReport : null;

  let consoleIssues: ConsoleIssue[] = [];
  let failedRequests: FailedRequest[] = [];
  let pageUrl: string | null = null;
  if (diag) {
    consoleIssues = parseConsole(diag.consoleIssues, "console");
    failedRequests = parseFailed(diag.failedNetworkRequests);
    if (Array.isArray(diag.timeline)) {
      for (const e of diag.timeline) {
        if (isObj(e) && e.kind === "navigation" && str(e.url)) {
          pageUrl = str(e.url);
          break;
        }
      }
    }
  }
  const meta = bug && isObj(bug.metadata) ? bug.metadata : null;
  pageUrl = (bug && str(bug.sourceUrl)) ?? pageUrl;
  const userAgent = (meta && (str(meta.userAgent) ?? str(meta.user_agent))) ?? null;

  return {
    title: str(clip.title),
    durationMs: num(clip.durationMs),
    pageUrl,
    userAgent,
    transcriptStatus: parseTranscriptStatus(root),
    transcript: parseTranscriptSegments(root),
    consoleIssues,
    failedRequests,
    frames: [],
    hasDiagnostics: diag !== null && (consoleIssues.length > 0 || failedRequests.length > 0 || isObj(diag.summary)),
  };
}

export function parseAgentTranscript(json: unknown): {
  status: TranscriptStatus;
  segments: TranscriptSegment[];
} {
  return { status: parseTranscriptStatus(json), segments: parseTranscriptSegments(json) };
}

/** Bug-report environment text from agent-context, if the clip carried one. */
export function readEnvironmentHint(json: unknown): string | null {
  if (!isObj(json) || !isObj(json.bugReport)) return null;
  const env = json.bugReport.environment;
  if (typeof env === "string") return str(env);
  if (isObj(env)) return Object.entries(env).filter(([, v]) => typeof v === "string" || typeof v === "number").map(([k, v]) => `${k}: ${String(v)}`).join(", ") || null;
  return null;
}
