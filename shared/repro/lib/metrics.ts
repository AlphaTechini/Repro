import type {
  Metrics,
  MetricsTotals,
  Report,
  ReportEvent,
  ReportMetrics,
} from "../types.js";

/** Duplicates count toward `reports` and follow-ups, but not time or completeness. */
function isDuplicate(report: Report): boolean {
  return report.status === "duplicate" || report.duplicateOfId !== null;
}

function isFiled(report: Report): boolean {
  return report.status === "filed";
}

function millisBetween(from: string, to: string | null): number | null {
  if (to === null) return null;
  const diff = Date.parse(to) - Date.parse(from);
  return Number.isFinite(diff) ? diff : null;
}

/**
 * Field attribution from the final provenance of each field. A reporter's
 * answer counts as human even when the agent wrote it.
 */
function countFields(report: Report): { agent: number; human: number } {
  let agent = 0;
  let human = 0;
  for (const provenance of Object.values(report.fieldSources)) {
    if (!provenance) continue;
    if (provenance.actor === "human" || provenance.source?.kind === "reporter") {
      human++;
    } else if (provenance.actor === "agent") {
      agent++;
    }
  }
  return { agent, human };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  const lower = sorted[mid - 1];
  const upper = sorted[mid];
  return lower === undefined || upper === undefined ? null : (lower + upper) / 2;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * PRD §3 metrics, computed from reports and their change events. Pure: no I/O.
 * Follow-ups use the larger of the stored counter and the number of
 * `followup_asked` events, so a missed counter write does not hide questions.
 */
export function computeMetrics(
  reports: Report[],
  events: ReportEvent[],
  now: Date,
): Metrics {
  const askedByReport = new Map<string, number>();
  for (const event of events) {
    if (event.kind !== "followup_asked") continue;
    askedByReport.set(event.reportId, (askedByReport.get(event.reportId) ?? 0) + 1);
  }

  const rows: ReportMetrics[] = [];
  const times: number[] = [];
  const completeness: number[] = [];
  let filed = 0;
  let followups = 0;
  let agentFields = 0;
  let humanFields = 0;

  for (const report of reports) {
    const counts = countFields(report);
    const reportFiled = isFiled(report);
    const followupCount = Math.max(report.followupCount, askedByReport.get(report.id) ?? 0);
    const timeToFixReadyMs = reportFiled ? millisBetween(report.createdAt, report.filedAt) : null;
    const completenessAtFiling = reportFiled ? report.completeness : null;

    rows.push({
      id: report.id,
      title: report.title,
      status: report.status,
      timeToFixReadyMs,
      followupCount,
      agentFields: counts.agent,
      humanFields: counts.human,
      completenessAtFiling,
      githubIssueUrl: report.githubIssueUrl,
      createdAt: report.createdAt,
    });

    followups += followupCount;
    agentFields += counts.agent;
    humanFields += counts.human;

    if (reportFiled) filed++;
    if (reportFiled && !isDuplicate(report)) {
      if (timeToFixReadyMs !== null) times.push(timeToFixReadyMs);
      if (completenessAtFiling !== null) completeness.push(completenessAtFiling);
    }
  }

  const totals: MetricsTotals = {
    reports: reports.length,
    filed,
    medianTimeToFixReadyMs: median(times),
    avgFollowups: reports.length === 0 ? null : followups / reports.length,
    agentFields,
    humanFields,
    avgCompletenessAtFiling: mean(completeness),
  };

  return { generatedAt: now.toISOString(), totals, reports: rows };
}
