import { describe, expect, it } from "vitest";

import { computeMetrics } from "../shared/repro/lib/metrics.js";
import type { FieldProvenance, Report, ReportEvent, ReportField } from "../shared/repro/types.js";

// Inline fixture: labelled test data, not used by app code.
const T0 = "2026-11-01T10:00:00.000Z";
const NOW = new Date("2026-11-03T12:00:00.000Z");

function report(overrides: Partial<Report> & Pick<Report, "id">): Report {
  return {
    orgId: "org_test",
    ownerEmail: "reporter@example.com",
    clipUrl: "https://clips.example.com/share/rec_1",
    recordingId: "rec_1",
    clipOrigin: "https://clips.example.com",
    agentThreadId: null,
    status: "draft",
    title: "Save does nothing",
    summary: null,
    steps: [],
    expected: null,
    actual: null,
    environment: null,
    frequency: null,
    severity: null,
    errorSignature: null,
    evidence: null,
    fieldSources: {},
    missingFields: [],
    completeness: 0,
    followupCount: 0,
    followupQuestions: [],
    duplicateOfId: null,
    githubIssueNumber: null,
    githubIssueUrl: null,
    createdAt: T0,
    clipReadAt: null,
    readyAt: null,
    filedAt: null,
    updatedAt: T0,
    ...overrides,
  };
}

const agentFromTranscript: FieldProvenance = {
  actor: "agent",
  source: { kind: "transcript", atMs: 3000 },
  at: T0,
};
const agentFromConsole: FieldProvenance = {
  actor: "agent",
  source: { kind: "console", ref: "TypeError at saveProfile" },
  at: T0,
};
const reporterAnswer: FieldProvenance = {
  actor: "agent",
  source: { kind: "reporter" },
  at: T0,
};
const humanEdit: FieldProvenance = { actor: "human", at: T0 };

function sources(entries: Partial<Record<ReportField, FieldProvenance>>): Partial<Record<ReportField, FieldProvenance>> {
  return entries;
}

describe("computeMetrics", () => {
  it("returns zeroed totals and null averages for no reports", () => {
    const metrics = computeMetrics([], [], NOW);
    expect(metrics.generatedAt).toBe(NOW.toISOString());
    expect(metrics.reports).toEqual([]);
    expect(metrics.totals).toEqual({
      reports: 0,
      filed: 0,
      medianTimeToFixReadyMs: null,
      avgFollowups: null,
      agentFields: 0,
      humanFields: 0,
      avgCompletenessAtFiling: null,
    });
  });

  it("measures time to fix-ready only for filed reports", () => {
    const filed = report({
      id: "a",
      status: "filed",
      completeness: 100,
      filedAt: "2026-11-01T10:01:00.000Z",
      githubIssueUrl: "https://github.com/demo/repo/issues/1",
    });
    const open = report({ id: "b", status: "needs-info", completeness: 50 });

    const metrics = computeMetrics([filed, open], [], NOW);
    const [rowA, rowB] = metrics.reports;
    expect(rowA?.timeToFixReadyMs).toBe(60_000);
    expect(rowA?.completenessAtFiling).toBe(100);
    expect(rowA?.githubIssueUrl).toBe("https://github.com/demo/repo/issues/1");
    expect(rowB?.timeToFixReadyMs).toBeNull();
    expect(rowB?.completenessAtFiling).toBeNull();
    expect(metrics.totals.filed).toBe(1);
  });

  it("takes the median of filed times and the mean completeness at filing", () => {
    const first = report({
      id: "a",
      status: "filed",
      completeness: 100,
      filedAt: "2026-11-01T10:01:00.000Z",
    });
    const second = report({
      id: "b",
      status: "filed",
      completeness: 80,
      createdAt: T0,
      filedAt: "2026-11-01T10:03:00.000Z",
    });
    const third = report({
      id: "c",
      status: "filed",
      completeness: 90,
      filedAt: "2026-11-01T10:05:00.000Z",
    });

    const { totals } = computeMetrics([first, second, third], [], NOW);
    // Times are 60s, 180s, 300s: median 180s.
    expect(totals.medianTimeToFixReadyMs).toBe(180_000);
    expect(totals.avgCompletenessAtFiling).toBeCloseTo(90);

    const even = computeMetrics([first, second], [], NOW);
    // Times are 60s and 180s: median 120s.
    expect(even.totals.medianTimeToFixReadyMs).toBe(120_000);
  });

  it("attributes each field by its final provenance", () => {
    const r = report({
      id: "a",
      status: "filed",
      completeness: 100,
      filedAt: "2026-11-01T10:01:00.000Z",
      fieldSources: sources({
        title: agentFromTranscript,
        steps: agentFromConsole,
        expected: reporterAnswer,
        actual: humanEdit,
        frequency: reporterAnswer,
      }),
    });

    const row = computeMetrics([r], [], NOW).reports[0];
    expect(row?.agentFields).toBe(2);
    expect(row?.humanFields).toBe(3);
    expect(computeMetrics([r], [], NOW).totals.agentFields).toBe(2);
    expect(computeMetrics([r], [], NOW).totals.humanFields).toBe(3);
  });

  it("uses the larger of the follow-up counter and the asked events", () => {
    const asked = report({ id: "a", followupCount: 2 });
    const unrecorded = report({ id: "b", followupCount: 0 });
    const events: ReportEvent[] = [
      { id: "e1", reportId: "b", actor: "agent", kind: "followup_asked", field: null, detail: null, at: T0 },
    ];

    const metrics = computeMetrics([asked, unrecorded], events, NOW);
    expect(metrics.reports.map((row) => row.followupCount)).toEqual([2, 1]);
    expect(metrics.totals.avgFollowups).toBeCloseTo(1.5);
  });

  it("counts duplicates in reports but leaves them out of time and completeness", () => {
    const filed = report({
      id: "a",
      status: "filed",
      completeness: 100,
      filedAt: "2026-11-01T10:01:00.000Z",
    });
    const duplicate = report({
      id: "b",
      status: "duplicate",
      duplicateOfId: "a",
      completeness: 40,
      fieldSources: sources({ title: agentFromTranscript }),
    });

    const { totals, reports } = computeMetrics([filed, duplicate], [], NOW);
    expect(totals.reports).toBe(2);
    expect(totals.filed).toBe(1);
    expect(totals.medianTimeToFixReadyMs).toBe(60_000);
    expect(totals.avgCompletenessAtFiling).toBe(100);
    expect(totals.agentFields).toBe(1);
    expect(reports[1]?.completenessAtFiling).toBeNull();
  });
});
