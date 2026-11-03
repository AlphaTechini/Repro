/**
 * Repro domain vocabulary for presentational components. Mirrors
 * docs/ARCHITECTURE.md §2. Data hooks should import these types rather than
 * redefine them.
 */

export type ReportStatus =
  "draft" | "needs-info" | "ready" | "filed" | "duplicate";

export type Severity = "low" | "medium" | "high" | "critical";

export type SourceKind =
  "transcript" | "console" | "network" | "frame" | "reporter";

export type Actor = "agent" | "human";

export interface FieldSource {
  kind: SourceKind;
  /** Offset into the recording, in milliseconds. */
  atMs?: number;
  /** Diagnostic entry id or quoted text the value came from. */
  ref?: string;
}

export interface FieldProvenance {
  actor: Actor;
  source?: FieldSource;
}

export const REPORT_STATUSES: readonly ReportStatus[] = [
  "draft",
  "needs-info",
  "ready",
  "filed",
  "duplicate",
];

export const STATUS_LABEL: Record<ReportStatus, string> = {
  draft: "Draft",
  "needs-info": "Needs info",
  ready: "Ready",
  filed: "Filed",
  duplicate: "Duplicate",
};

export const SEVERITIES: readonly Severity[] = [
  "low",
  "medium",
  "high",
  "critical",
];

export const SEVERITY_LABEL: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  transcript: "transcript",
  console: "console",
  network: "network",
  frame: "frame",
  reporter: "reporter",
};
