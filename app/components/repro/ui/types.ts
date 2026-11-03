/**
 * Repro domain vocabulary for presentational components. Types come from
 * shared/repro/types.ts (the domain contract). Data hooks should import these types rather than
 * redefine them.
 */

export type {
  Actor,
  FieldProvenance,
  FieldSource,
  ReportStatus,
  Severity,
  SourceKind,
} from "@shared/repro/types";

import type { ReportStatus, Severity, SourceKind } from "@shared/repro/types";

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
