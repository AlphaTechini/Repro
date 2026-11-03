import {
  DEFAULT_REQUIRED_FIELDS,
  type ClipEvidence,
  type FieldProvenance,
  type ReportField,
  type RequirableField,
} from "../types";

export interface CompletenessInput {
  title?: string | null;
  steps?: string[] | null;
  expected?: string | null;
  actual?: string | null;
  environment?: string | null;
  frequency?: string | null;
  severity?: string | null;
  breaksAtMs?: number | null;
  evidence?: ClipEvidence | null;
  fieldSources?: Partial<Record<ReportField, FieldProvenance>> | null;
}

const filled = (v: string | null | undefined) =>
  typeof v === "string" && v.trim().length > 0;

function hasEvidenceTimestamp(r: CompletenessInput): boolean {
  if (typeof r.breaksAtMs === "number") return true;
  const sources = Object.values(r.fieldSources ?? {});
  if (sources.some((s) => s?.source && typeof s.source.atMs === "number")) return true;
  const ev = r.evidence;
  if (!ev) return false;
  return (
    ev.consoleIssues.some((i) => typeof i.atMs === "number") ||
    ev.failedRequests.some((q) => typeof q.atMs === "number")
  );
}

export function isFieldPresent(field: RequirableField, r: CompletenessInput): boolean {
  switch (field) {
    case "title":
      return filled(r.title);
    case "steps":
      return (r.steps ?? []).filter((s) => filled(s)).length >= 2;
    case "expected":
      return filled(r.expected);
    case "actual":
      return filled(r.actual);
    case "environment":
      return filled(r.environment);
    case "frequency":
      return filled(r.frequency);
    case "severity":
      return filled(r.severity);
    case "evidence":
      return hasEvidenceTimestamp(r);
  }
}

export function computeCompleteness(
  report: CompletenessInput,
  requiredFields: readonly RequirableField[] = DEFAULT_REQUIRED_FIELDS,
): { percent: number; missing: RequirableField[] } {
  const required = Array.from(new Set(requiredFields));
  if (required.length === 0) return { percent: 100, missing: [] };
  const missing = required.filter((f) => !isFieldPresent(f, report));
  const present = required.length - missing.length;
  return { percent: Math.round((100 * present) / required.length), missing };
}
