import type { FieldProvenance, Report, ReportField } from "../types.js";
import { clipLinkAt, formatClipTime } from "./time.js";

type IssueReport = Pick<
  Report,
  | "clipUrl"
  | "title"
  | "summary"
  | "steps"
  | "expected"
  | "actual"
  | "environment"
  | "frequency"
  | "severity"
  | "evidence"
  | "fieldSources"
>;

/** Share link without the private agent_access token (issues may be public). */
export function publicClipUrl(clipUrl: string): string {
  try {
    const u = new URL(clipUrl);
    u.searchParams.delete("agent_access");
    return u.toString();
  } catch {
    return clipUrl;
  }
}

function finiteMs(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function firstByTime<T extends { atMs: number | null }>(items: T[]): T | null {
  let best: T | null = null;
  for (const it of items) {
    if (finiteMs(it.atMs) === null) continue;
    if (!best || (it.atMs as number) < (best.atMs as number)) best = it;
  }
  return best ?? items[0] ?? null;
}

export function firstConsoleError(report: Pick<Report, "evidence">) {
  const errs = (report.evidence?.consoleIssues ?? []).filter(
    (c) => c.level === "error",
  );
  return firstByTime(errs);
}

export function firstFailedRequest(report: Pick<Report, "evidence">) {
  return firstByTime(report.evidence?.failedRequests ?? []);
}

/** Earliest of: first console error, first failed request, else first agent source time. */
export function breakingMomentMs(
  report: Pick<Report, "evidence" | "fieldSources">,
): number | null {
  const times: number[] = [];
  const c = firstConsoleError(report);
  const n = firstFailedRequest(report);
  for (const t of [finiteMs(c?.atMs), finiteMs(n?.atMs)]) {
    if (t !== null) times.push(t);
  }
  if (times.length) return Math.max(0, Math.min(...times));
  const agent: number[] = [];
  for (const p of Object.values(report.fieldSources) as FieldProvenance[]) {
    const t = finiteMs(p?.source?.atMs);
    if (p?.actor === "agent" && t !== null) agent.push(t);
  }
  return agent.length ? Math.max(0, Math.min(...agent)) : null;
}

export function renderIssueTitle(report: Pick<Report, "title">): string {
  return (report.title ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
}

const FIELD_LABEL: Record<ReportField, string> = {
  title: "title",
  summary: "summary",
  steps: "steps",
  expected: "expected",
  actual: "actual",
  environment: "environment",
  frequency: "frequency",
  severity: "severity",
};

export function humanConfirmedFields(
  fieldSources: IssueReport["fieldSources"],
): string[] {
  const out: string[] = [];
  for (const [field, p] of Object.entries(fieldSources) as [
    ReportField,
    FieldProvenance | undefined,
  ][]) {
    if (!p) continue;
    if (p.actor === "human" || p.source?.kind === "reporter") {
      out.push(FIELD_LABEL[field] ?? field);
    }
  }
  return out;
}

function inline(text: string): string {
  // Keep one line and avoid breaking the inline code span.
  return text.replace(/\s+/g, " ").replace(/`/g, "'").trim().slice(0, 300);
}

export function renderIssueBody(report: IssueReport): string {
  const parts: string[] = [];
  if (report.summary?.trim()) parts.push(`## Summary\n${report.summary.trim()}`);

  const steps = report.steps.map((s) => s.trim()).filter(Boolean);
  if (steps.length) {
    parts.push(
      `## Steps to reproduce\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    );
  }
  if (report.expected?.trim()) parts.push(`## Expected\n${report.expected.trim()}`);
  if (report.actual?.trim()) parts.push(`## Actual\n${report.actual.trim()}`);

  const evidence: string[] = [];
  const base = publicClipUrl(report.clipUrl);
  const at = breakingMomentMs(report);
  if (at !== null) {
    evidence.push(
      `- Recording: ${clipLinkAt(base, at)} (breaks at ${formatClipTime(at)})`,
    );
  } else if (base) {
    evidence.push(`- Recording: ${base}`);
  }
  const con = firstConsoleError(report);
  if (con?.message) evidence.push(`- Console: \`${inline(con.message)}\``);
  const req = firstFailedRequest(report);
  if (req) {
    const status = req.status ?? (req.error ? inline(req.error) : null);
    if (status !== null) {
      evidence.push(
        `- Network: \`${req.method.toUpperCase()} ${inline(req.path)} -> ${status}\``,
      );
    }
  }
  if (evidence.length) parts.push(`## Evidence\n${evidence.join("\n")}`);

  if (report.environment?.trim())
    parts.push(`## Environment\n${report.environment.trim()}`);

  const fs: string[] = [];
  if (report.frequency) fs.push(`**Frequency:** ${report.frequency}`);
  if (report.severity) fs.push(`**Severity:** ${report.severity}`);
  if (fs.length) parts.push(fs.join(" · "));

  const human = humanConfirmedFields(report.fieldSources);
  parts.push(
    `<sub>Filed by Repro. Fields marked by the agent are sourced from the recording; the reporter confirmed: ${human.length ? human.join(", ") : "none"}.</sub>`,
  );
  return parts.join("\n\n") + "\n";
}
