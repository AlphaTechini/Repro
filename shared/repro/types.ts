/**
 * Repro domain contract. Shared by actions (server), UI (app) and tests.
 * Mirrors docs/ARCHITECTURE.md §2–§3. Keep this file free of runtime
 * dependencies other than plain constants so it is safe on both sides.
 */

export type ReportStatus =
  | "draft"
  | "needs-info"
  | "ready"
  | "filed"
  | "duplicate";

export type Severity = "low" | "medium" | "high" | "critical";

export type Frequency = "always" | "often" | "sometimes" | "once";

export type SourceKind =
  | "transcript"
  | "console"
  | "network"
  | "frame"
  | "reporter";

export type Actor = "agent" | "human";

export type EventActor = Actor | "system";

export type EventKind =
  | "report_created"
  | "clip_read"
  | "field_set"
  | "followup_asked"
  | "filed"
  | "duplicate_marked"
  | "evidence_merged";

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
  /** ISO timestamp of the write. */
  at: string;
}

/** Report fields that can be edited by the agent or the reporter. */
export type ReportField =
  | "title"
  | "summary"
  | "steps"
  | "expected"
  | "actual"
  | "environment"
  | "frequency"
  | "severity";

export const REPORT_FIELDS: readonly ReportField[] = [
  "title",
  "summary",
  "steps",
  "expected",
  "actual",
  "environment",
  "frequency",
  "severity",
];

/** Fields that can be required for completeness (PRD R4). */
export type RequirableField =
  | "title"
  | "steps"
  | "expected"
  | "actual"
  | "frequency"
  | "severity"
  | "environment"
  | "evidence";

export const DEFAULT_REQUIRED_FIELDS: readonly RequirableField[] = [
  "title",
  "steps",
  "expected",
  "actual",
  "frequency",
  "severity",
  "environment",
  "evidence",
];

export const REQUIRABLE_FIELDS: readonly RequirableField[] =
  DEFAULT_REQUIRED_FIELDS;

export const MAX_FOLLOWUPS = 3;

// ---------------------------------------------------------------------------
// Evidence read from a Clip
// ---------------------------------------------------------------------------

export interface TranscriptSegment {
  startMs: number;
  endMs: number;
  text: string;
}

export type TranscriptStatus =
  | "ready"
  | "pending"
  | "failed"
  | "unavailable"
  | "none";

export interface ConsoleIssue {
  id: string;
  level: "error" | "warn" | "info" | "log" | "debug";
  message: string;
  /** Offset into the recording (ms). May be negative (logged before start). */
  atMs: number | null;
  source?: string;
}

export interface FailedRequest {
  id: string;
  method: string;
  url: string;
  /** Path portion only, for display and signatures. */
  path: string;
  status: number | null;
  statusText?: string;
  error?: string;
  atMs: number | null;
  durationMs?: number | null;
}

export interface FrameMarker {
  atMs: number;
  label: string;
}

export interface ClipEvidence {
  title?: string | null;
  durationMs?: number | null;
  pageUrl?: string | null;
  userAgent?: string | null;
  transcriptStatus: TranscriptStatus;
  transcript: TranscriptSegment[];
  consoleIssues: ConsoleIssue[];
  failedRequests: FailedRequest[];
  frames: FrameMarker[];
  /** True if the clip carried browser diagnostics (Clips extension). */
  hasDiagnostics: boolean;
}

// ---------------------------------------------------------------------------
// Report DTO (what get-report / list-reports return)
// ---------------------------------------------------------------------------

export interface Report {
  id: string;
  orgId: string;
  ownerEmail: string;
  clipUrl: string;
  recordingId: string;
  clipOrigin: string;
  agentThreadId: string | null;
  status: ReportStatus;
  title: string | null;
  summary: string | null;
  steps: string[];
  expected: string | null;
  actual: string | null;
  environment: string | null;
  frequency: Frequency | null;
  severity: Severity | null;
  errorSignature: string | null;
  evidence: ClipEvidence | null;
  fieldSources: Partial<Record<ReportField, FieldProvenance>>;
  missingFields: RequirableField[];
  completeness: number;
  followupCount: number;
  followupQuestions: string[];
  duplicateOfId: string | null;
  githubIssueNumber: number | null;
  githubIssueUrl: string | null;
  createdAt: string;
  clipReadAt: string | null;
  readyAt: string | null;
  filedAt: string | null;
  updatedAt: string;
}

export interface ReportListItem {
  id: string;
  status: ReportStatus;
  title: string | null;
  errorSignature: string | null;
  severity: Severity | null;
  completeness: number;
  ownerEmail: string;
  githubIssueNumber: number | null;
  githubIssueUrl: string | null;
  createdAt: string;
  filedAt: string | null;
  /** filedAt - createdAt in ms, null if not filed. */
  timeToFixReadyMs: number | null;
}

export interface ReportEvent {
  id: string;
  reportId: string;
  actor: EventActor;
  kind: EventKind;
  field: string | null;
  detail: string | null;
  at: string;
}

// ---------------------------------------------------------------------------
// Settings (stored via org settings, key "repro")
// ---------------------------------------------------------------------------

export interface ReproSettings {
  githubInstallationId: number | null;
  githubAccount: string | null;
  /** "owner/name" */
  githubRepo: string | null;
  autoFile: boolean;
  requiredFields: RequirableField[];
}

/** What get-settings returns to the UI (never includes secrets). */
export interface ReproSettingsView extends ReproSettings {
  /** True when GITHUB_APP_ID / SLUG / PRIVATE_KEY are configured on the server. */
  githubAppConfigured: boolean;
  /** https://github.com/apps/<slug>/installations/new, or null when not configured. */
  githubInstallUrl: string | null;
}

// ---------------------------------------------------------------------------
// Metrics (PRD §3)
// ---------------------------------------------------------------------------

export interface ReportMetrics {
  id: string;
  title: string | null;
  status: ReportStatus;
  timeToFixReadyMs: number | null;
  followupCount: number;
  agentFields: number;
  humanFields: number;
  completenessAtFiling: number | null;
  githubIssueUrl: string | null;
  createdAt: string;
}

export interface MetricsTotals {
  reports: number;
  filed: number;
  medianTimeToFixReadyMs: number | null;
  avgFollowups: number | null;
  agentFields: number;
  humanFields: number;
  /** Mean completeness at filing across filed reports (0–100). */
  avgCompletenessAtFiling: number | null;
}

export interface Metrics {
  generatedAt: string;
  totals: MetricsTotals;
  reports: ReportMetrics[];
}

// ---------------------------------------------------------------------------
// Action names (single place to keep UI, agent tool list and docs in sync)
// ---------------------------------------------------------------------------

export const REPRO_ACTIONS = [
  "create-report",
  "read-clip",
  "get-clip-frame",
  "update-report-fields",
  "check-report-completeness",
  "record-followups",
  "find-similar-reports",
  "mark-duplicate",
  "file-github-issue",
  "list-reports",
  "get-report",
  "list-report-events",
  "get-metrics",
  "export-metrics",
  "get-settings",
  "update-settings",
  "list-github-repos",
] as const;

export type ReproActionName = (typeof REPRO_ACTIONS)[number];
