import type { Actor, FieldProvenance, FieldSource, ReportField } from "../types";
import { REPORT_FIELDS } from "../types";

export interface SourceInput {
  kind: FieldSource["kind"];
  atMs?: number | undefined;
  ref?: string | undefined;
}

export interface FieldChange {
  field: ReportField;
  value: unknown;
  source?: SourceInput | undefined;
}

function cleanSource(s: SourceInput): FieldSource {
  const out: FieldSource = { kind: s.kind };
  if (typeof s.atMs === "number") out.atMs = s.atMs;
  if (s.ref) out.ref = s.ref;
  return out;
}

export interface ValidatedChange {
  field: ReportField;
  value: string | string[] | null;
  provenance: Omit<FieldProvenance, "at">;
}

export type ValidateResult =
  | { ok: true; changes: ValidatedChange[] }
  | { ok: false; errorCode: "source_required" | "invalid_value"; message: string };

const SEVERITIES = ["low", "medium", "high", "critical"];
const FREQUENCIES = ["always", "often", "sometimes", "once"];

export function normalizeFieldValue(
  field: ReportField,
  value: unknown,
): { ok: true; value: string | string[] | null } | { ok: false; message: string } {
  if (field === "steps") {
    const list = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(/\r?\n/)
        : null;
    if (!list) return { ok: false, message: "steps must be an array of strings." };
    const steps = list
      .map((s) => (typeof s === "string" ? s.replace(/^\s*(?:\d+[.)]|[-*])\s+/, "").trim() : ""))
      .filter((s) => s.length > 0);
    return { ok: true, value: steps };
  }
  if (value === null || value === undefined) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, message: `${field} must be a string.` };
  const v = value.trim();
  if (v === "") return { ok: true, value: null };
  if (field === "severity" && !SEVERITIES.includes(v)) {
    return { ok: false, message: `severity must be one of ${SEVERITIES.join(", ")}.` };
  }
  if (field === "frequency" && !FREQUENCIES.includes(v)) {
    return { ok: false, message: `frequency must be one of ${FREQUENCIES.join(", ")}.` };
  }
  return { ok: true, value: v };
}

/** Pure source rule + value validation. The actor never comes from args. */
export function validateChanges(changes: FieldChange[], actor: Actor): ValidateResult {
  const out: ValidatedChange[] = [];
  for (const c of changes) {
    if (!REPORT_FIELDS.includes(c.field)) {
      return { ok: false, errorCode: "invalid_value", message: `Unknown field "${String(c.field)}".` };
    }
    if (actor === "agent" && !c.source) {
      return {
        ok: false,
        errorCode: "source_required",
        message: `Field "${c.field}" has no source. Every agent edit must cite where it came from: source { kind: "transcript" | "console" | "network" | "frame" | "reporter", atMs?, ref? } (a transcript line, console entry, failed request, frame, or something the reporter told you). Re-send the change with a source.`,
      };
    }
    const norm = normalizeFieldValue(c.field, c.value);
    if (!norm.ok) return { ok: false, errorCode: "invalid_value", message: norm.message };
    const source: FieldSource = actor === "human" ? { kind: "reporter" } : cleanSource(c.source as SourceInput);
    out.push({ field: c.field, value: norm.value, provenance: { actor, source } });
  }
  return { ok: true, changes: out };
}
