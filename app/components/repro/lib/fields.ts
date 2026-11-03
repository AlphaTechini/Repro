import type {
  Frequency,
  Report,
  ReportEvent,
  ReportField,
  RequirableField,
} from "@shared/repro/types";

/** "0:07", "1:02:03" or "7" (seconds) -> ms. null = invalid. */
export function parseClipTimeInput(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw) * 1000;
  const parts = raw.split(":");
  if (parts.length < 2 || parts.length > 3 || !parts.every((p) => /^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  const secs = nums[nums.length - 1] ?? 0;
  const mins = nums[nums.length - 2] ?? 0;
  const hours = nums.length === 3 ? (nums[0] ?? 0) : 0;
  if (secs > 59 || (nums.length === 3 && mins > 59)) return null;
  return ((hours * 60 + mins) * 60 + secs) * 1000;
}

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
  evidence: "Breaks at",
};

/** Domain field -> DOM id of its control inside the report form. */
export function fieldDomId(field: RequirableField | ReportField): string {
  return field === "evidence" ? "report-breaksAt" : `report-${field}`;
}

/** Fields the agent can fill from the recording. */
export const AGENT_FILLABLE: readonly ReportField[] = [
  "breaksAt",
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
