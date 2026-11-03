import { z } from "zod";
import {
  REPORT_FIELDS,
  REQUIRABLE_FIELDS,
  type ClipEvidence,
  type FieldProvenance,
  type ReportField,
  type RequirableField,
} from "../../../shared/repro/types.js";

const sourceKind = z.enum(["transcript", "console", "network", "frame", "reporter"]);

const provenance = z.object({
  actor: z.enum(["agent", "human"]),
  source: z
    .object({
      kind: sourceKind,
      atMs: z.number().optional(),
      ref: z.string().optional(),
    })
    .optional(),
  at: z.string(),
});

const evidence = z.object({
  title: z.string().nullable().optional(),
  durationMs: z.number().nullable().optional(),
  pageUrl: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  transcriptStatus: z.enum(["ready", "pending", "failed", "unavailable", "none"]).catch("unavailable"),
  transcript: z.array(z.object({ startMs: z.number(), endMs: z.number(), text: z.string() })).catch([]),
  consoleIssues: z
    .array(
      z.object({
        id: z.string(),
        level: z.enum(["error", "warn", "info", "log", "debug"]),
        message: z.string(),
        atMs: z.number().nullable(),
        source: z.string().optional(),
      }),
    )
    .catch([]),
  failedRequests: z
    .array(
      z.object({
        id: z.string(),
        method: z.string(),
        url: z.string(),
        path: z.string(),
        status: z.number().nullable(),
        statusText: z.string().optional(),
        error: z.string().optional(),
        atMs: z.number().nullable(),
        durationMs: z.number().nullable().optional(),
      }),
    )
    .catch([]),
  frames: z.array(z.object({ atMs: z.number(), label: z.string() })).catch([]),
  hasDiagnostics: z.boolean().catch(false),
});

function parseJson(text: string | null | undefined): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function encodeJson(value: unknown): string {
  return JSON.stringify(value);
}

export function decodeSteps(text: string | null): string[] {
  const v = z.array(z.string()).safeParse(parseJson(text));
  return v.success ? v.data : [];
}

export function decodeStringList(text: string | null): string[] {
  return decodeSteps(text);
}

export function decodeMissing(text: string | null): RequirableField[] {
  const v = parseJson(text);
  if (!Array.isArray(v)) return [];
  return v.filter((f): f is RequirableField => (REQUIRABLE_FIELDS as readonly unknown[]).includes(f));
}

export function decodeEvidence(text: string | null): ClipEvidence | null {
  const raw = parseJson(text);
  if (raw === undefined || raw === null || typeof raw !== "object") return null;
  const r = evidence.safeParse(raw);
  return r.success ? (r.data as ClipEvidence) : null;
}

export function decodeFieldSources(text: string | null): Partial<Record<ReportField, FieldProvenance>> {
  const raw = parseJson(text);
  const out: Partial<Record<ReportField, FieldProvenance>> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const f of REPORT_FIELDS) {
    const r = provenance.safeParse((raw as Record<string, unknown>)[f]);
    if (r.success) out[f] = r.data as FieldProvenance;
  }
  return out;
}
