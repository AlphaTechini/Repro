import type {
  Frequency,
  Report,
  ReportEvent,
  ReportField,
  RequirableField,
} from "@shared/repro/types";

export const FREQUENCY_ORDER: readonly Frequency[] = [
  "always",
  "often",
  "sometimes",
  "once",
];

export const FIELD_LABEL: Record<RequirableField, string> = {
  title: "Title",
  steps: "Steps",
  expected: "Expected",
  actual: "Actual",
  frequency: "Frequency",
  severity: "Severity",
  environment: "Environment",
  evidence: "Recording timestamp",
};

/** Domain field -> DOM id of its control inside the report form. */
export function fieldDomId(field: RequirableField | ReportField): string {
  return field === "evidence" ? "title" : `report-${field}`;
}

/** Fields the agent can fill from the recording. */
export const AGENT_FILLABLE: readonly ReportField[] = [
  "title",
  "summary",
  "steps",
  "actual",
  "environment",
];

export function isReadOnlyStatus(status: Report["status"]): boolean {
  return status === "filed" || status === "duplicate";
}

/** Latest agent field_set event id per field, for the agent-fill highlight. */
export function latestAgentFlashKeys(
  events: readonly ReportEvent[] | undefined,
): Partial<Record<string, string>> | undefined {
  if (!events) return undefined;
  const out: Record<string, { at: number; id: string }> = {};
  for (const e of events) {
    if (e.actor !== "agent" || e.kind !== "field_set" || !e.field) continue;
    const at = new Date(e.at).getTime();
    const prev = out[e.field];
    if (!prev || at >= prev.at) out[e.field] = { at, id: e.id };
  }
  const keys: Record<string, string> = {};
  for (const [field, v] of Object.entries(out)) keys[field] = v.id;
  return keys;
}

export function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return a === b;
}
