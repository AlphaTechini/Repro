import { fail } from "@agent-native/core/action";
import { isUniqueViolation } from "@agent-native/core/db";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { getDb } from "../../db/index.js";
import { reportEvents, reports } from "../../db/schema.js";
import { computeCompleteness } from "../../../shared/repro/lib/completeness.js";
import type {
  EventActor,
  EventKind,
  Frequency,
  Report,
  ReportEvent,
  ReportListItem,
  ReportStatus,
  Severity,
} from "../../../shared/repro/types.js";
import {
  decodeEvidence,
  decodeFieldSources,
  decodeMissing,
  decodeSteps,
  decodeStringList,
  encodeJson,
} from "./codec.js";
import { readReproSettings } from "./settings.js";
import type { Scope } from "./scope.js";

export type ReportPatch = Partial<Omit<Report, "id" | "orgId" | "ownerEmail" | "createdAt">>;

type Row = typeof reports.$inferSelect;

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(9).toString("hex")}`;
}

export function rowToReport(r: Row): Report {
  return {
    id: r.id,
    orgId: r.orgId,
    ownerEmail: r.ownerEmail,
    clipUrl: r.clipUrl,
    recordingId: r.recordingId,
    clipOrigin: r.clipOrigin,
    agentThreadId: r.agentThreadId,
    status: r.status,
    title: r.title,
    summary: r.summary,
    steps: decodeSteps(r.stepsJson),
    expected: r.expected,
    actual: r.actual,
    environment: r.environment,
    frequency: r.frequency as Frequency | null,
    severity: r.severity as Severity | null,
    errorSignature: r.errorSignature,
    evidence: decodeEvidence(r.evidenceJson),
    fieldSources: decodeFieldSources(r.fieldSourcesJson),
    missingFields: decodeMissing(r.missingFieldsJson),
    completeness: r.completeness,
    followupCount: r.followupCount,
    followupQuestions: decodeStringList(r.followupQuestionsJson),
    duplicateOfId: r.duplicateOfId,
    githubIssueNumber: r.githubIssueNumber,
    githubIssueUrl: r.githubIssueUrl,
    createdAt: r.createdAt,
    clipReadAt: r.clipReadAt,
    readyAt: r.readyAt,
    filedAt: r.filedAt,
    updatedAt: r.updatedAt,
  };
}

const mine = (scope: Scope, id: string) =>
  and(eq(reports.id, id), eq(reports.orgId, scope.orgKey));

export async function loadReport(scope: Scope, id: string): Promise<Report> {
  const [row] = await getDb().select().from(reports).where(mine(scope, id)).limit(1);
  if (!row) return fail("Report not found.", { errorCode: "not_found", statusCode: 404 });
  return rowToReport(row);
}

export async function listReports(
  scope: Scope,
  opts: { status?: ReportStatus; limit?: number } = {},
): Promise<Report[]> {
  const where = opts.status
    ? and(eq(reports.orgId, scope.orgKey), eq(reports.status, opts.status))
    : eq(reports.orgId, scope.orgKey);
  const rows = await getDb()
    .select()
    .from(reports)
    .where(where)
    .orderBy(desc(reports.createdAt))
    .limit(Math.min(Math.max(opts.limit ?? 100, 1), 500));
  return rows.map(rowToReport);
}

export async function insertReport(
  scope: Scope,
  input: {
    id: string;
    clipUrl: string;
    recordingId: string;
    clipOrigin: string;
    agentThreadId: string | null;
  },
): Promise<Report> {
  const now = new Date().toISOString();
  await getDb().insert(reports).values({
    ...input,
    orgId: scope.orgKey,
    ownerEmail: scope.userEmail,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });
  return loadReport(scope, input.id);
}

function patchToSet(patch: ReportPatch): Partial<typeof reports.$inferInsert> {
  const set: Partial<typeof reports.$inferInsert> = {};
  const p = patch;
  if (p.clipUrl !== undefined) set.clipUrl = p.clipUrl;
  if (p.recordingId !== undefined) set.recordingId = p.recordingId;
  if (p.clipOrigin !== undefined) set.clipOrigin = p.clipOrigin;
  if (p.agentThreadId !== undefined) set.agentThreadId = p.agentThreadId;
  if (p.status !== undefined) set.status = p.status;
  if (p.title !== undefined) set.title = p.title;
  if (p.summary !== undefined) set.summary = p.summary;
  if (p.steps !== undefined) set.stepsJson = encodeJson(p.steps);
  if (p.expected !== undefined) set.expected = p.expected;
  if (p.actual !== undefined) set.actual = p.actual;
  if (p.environment !== undefined) set.environment = p.environment;
  if (p.frequency !== undefined) set.frequency = p.frequency;
  if (p.severity !== undefined) set.severity = p.severity;
  if (p.errorSignature !== undefined) set.errorSignature = p.errorSignature;
  if (p.evidence !== undefined) set.evidenceJson = p.evidence === null ? null : encodeJson(p.evidence);
  if (p.fieldSources !== undefined) set.fieldSourcesJson = encodeJson(p.fieldSources);
  if (p.missingFields !== undefined) set.missingFieldsJson = encodeJson(p.missingFields);
  if (p.completeness !== undefined) set.completeness = p.completeness;
  if (p.followupCount !== undefined) set.followupCount = p.followupCount;
  if (p.followupQuestions !== undefined) set.followupQuestionsJson = encodeJson(p.followupQuestions);
  if (p.duplicateOfId !== undefined) set.duplicateOfId = p.duplicateOfId;
  if (p.githubIssueNumber !== undefined) set.githubIssueNumber = p.githubIssueNumber;
  if (p.githubIssueUrl !== undefined) set.githubIssueUrl = p.githubIssueUrl;
  if (p.clipReadAt !== undefined) set.clipReadAt = p.clipReadAt;
  if (p.readyAt !== undefined) set.readyAt = p.readyAt;
  if (p.filedAt !== undefined) set.filedAt = p.filedAt;
  return set;
}

export async function patchReport(scope: Scope, id: string, patch: ReportPatch): Promise<Report> {
  const set = patchToSet(patch);
  const updated = await getDb()
    .update(reports)
    .set({ ...set, updatedAt: patch.updatedAt ?? new Date().toISOString() })
    .where(mine(scope, id))
    .returning({ id: reports.id });
  if (updated.length === 0) {
    return fail("Report not found.", { errorCode: "not_found", statusCode: 404 });
  }
  return loadReport(scope, id);
}

/** Compare-and-set: records the issue only if none is set yet. False = already filed. */
export async function claimIssue(
  scope: Scope,
  id: string,
  issue: { number: number; url: string },
): Promise<boolean> {
  const now = new Date().toISOString();
  try {
    const rows = await getDb()
      .update(reports)
      .set({
        githubIssueNumber: issue.number,
        githubIssueUrl: issue.url,
        status: "filed",
        filedAt: now,
        updatedAt: now,
      })
      .where(and(mine(scope, id), isNull(reports.githubIssueNumber)))
      .returning({ id: reports.id });
    return rows.length > 0;
  } catch (err) {
    if (isUniqueViolation(err)) return false;
    throw err;
  }
}

export async function logEvent(
  scope: Scope,
  e: { reportId: string; actor: EventActor; kind: EventKind; field?: string | null; detail?: string | null },
): Promise<void> {
  await getDb().insert(reportEvents).values({
    id: newId("evt"),
    reportId: e.reportId,
    orgId: scope.orgKey,
    actor: e.actor,
    kind: e.kind,
    field: e.field ?? null,
    detail: e.detail ?? null,
    at: new Date().toISOString(),
  });
}

export async function listEvents(scope: Scope, reportId: string): Promise<ReportEvent[]> {
  const rows = await getDb()
    .select()
    .from(reportEvents)
    .where(and(eq(reportEvents.orgId, scope.orgKey), eq(reportEvents.reportId, reportId)))
    .orderBy(asc(reportEvents.at), asc(reportEvents.id));
  return rows.map((r) => ({
    id: r.id,
    reportId: r.reportId,
    actor: r.actor,
    kind: r.kind as EventKind,
    field: r.field,
    detail: r.detail,
    at: r.at,
  }));
}

export async function recomputeCompleteness(scope: Scope, id: string): Promise<Report> {
  const report = await loadReport(scope, id);
  const settings = await readReproSettings(scope);
  const { percent, missing } = computeCompleteness(report, settings.requiredFields);
  const patch: ReportPatch = { completeness: percent, missingFields: missing };
  if (report.status !== "filed" && report.status !== "duplicate") {
    patch.status = missing.length === 0 ? "ready" : "needs-info";
    if (missing.length === 0 && !report.readyAt) patch.readyAt = new Date().toISOString();
  }
  return patchReport(scope, id, patch);
}

export function toListItem(r: Report): ReportListItem {
  const filed = r.filedAt ? Date.parse(r.filedAt) - Date.parse(r.createdAt) : NaN;
  return {
    id: r.id,
    status: r.status,
    title: r.title,
    errorSignature: r.errorSignature,
    severity: r.severity,
    completeness: r.completeness,
    ownerEmail: r.ownerEmail,
    githubIssueNumber: r.githubIssueNumber,
    githubIssueUrl: r.githubIssueUrl,
    createdAt: r.createdAt,
    filedAt: r.filedAt,
    timeToFixReadyMs: Number.isFinite(filed) ? filed : null,
  };
}
