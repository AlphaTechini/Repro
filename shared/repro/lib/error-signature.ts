import type { ClipEvidence } from "../types";

const MAX_LEN = 120;

export function normalizeMessage(message: string): string {
  return message
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/"[^"]*"|'[^']*'|`[^`]*`/g, "")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "")
    .replace(/\b0x[0-9a-f]+\b/gi, "")
    .replace(/\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{6,}\b/gi, "")
    .replace(/\d+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LEN)
    .trim();
}

const UUID_SEG = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizePath(path: string): string {
  const noQuery = (path.split(/[?#]/)[0] ?? "") || "/";
  const segs = noQuery.split("/").map((s) => {
    if (!s) return s;
    if (/^\d+$/.test(s) || UUID_SEG.test(s)) return ":id";
    if (/^[0-9a-f]{12,}$/i.test(s)) return ":id";
    return s;
  });
  return segs.join("/") || "/";
}

export function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split(/[?#]/)[0] || "/";
  }
}

/** Stable signature for duplicate detection. null when there is nothing to key on. */
export function computeErrorSignature(
  evidence: Pick<ClipEvidence, "consoleIssues" | "failedRequests"> | null | undefined,
): string | null {
  if (!evidence) return null;
  const issues = evidence.consoleIssues ?? [];
  const issue =
    issues.find((i) => i.level === "error") ?? issues.find((i) => i.level === "warn");
  if (issue) {
    const norm = normalizeMessage(issue.message);
    if (norm) return norm;
  }
  const req = (evidence.failedRequests ?? [])[0];
  if (req) {
    const path = normalizePath(req.path || pathOf(req.url));
    const status = req.status ?? "ERR";
    return `${req.method.toUpperCase()} ${path} ${status}`;
  }
  return null;
}
