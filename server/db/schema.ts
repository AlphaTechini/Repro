import { index, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Timestamps are ISO text written from app code; JSON lives in *_json text columns.
export const reports = pgTable(
  "repro_reports",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    ownerEmail: text("owner_email").notNull(),
    clipUrl: text("clip_url").notNull(),
    recordingId: text("recording_id").notNull(),
    clipOrigin: text("clip_origin").notNull(),
    agentThreadId: text("agent_thread_id"),
    status: text("status", {
      enum: ["draft", "needs-info", "ready", "filed", "duplicate"],
    })
      .notNull()
      .default("draft"),
    title: text("title"),
    summary: text("summary"),
    stepsJson: text("steps_json").notNull().default("[]"),
    expected: text("expected"),
    actual: text("actual"),
    environment: text("environment"),
    frequency: text("frequency"),
    severity: text("severity"),
    breaksAtMs: integer("breaks_at_ms"),
    errorSignature: text("error_signature"),
    evidenceJson: text("evidence_json"),
    fieldSourcesJson: text("field_sources_json").notNull().default("{}"),
    missingFieldsJson: text("missing_fields_json").notNull().default("[]"),
    completeness: integer("completeness").notNull().default(0),
    followupCount: integer("followup_count").notNull().default(0),
    followupQuestionsJson: text("followup_questions_json").notNull().default("[]"),
    duplicateOfId: text("duplicate_of_id"),
    githubIssueNumber: integer("github_issue_number"),
    githubIssueUrl: text("github_issue_url"),
    createdAt: text("created_at").notNull(),
    clipReadAt: text("clip_read_at"),
    readyAt: text("ready_at"),
    filedAt: text("filed_at"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("repro_reports_org_created_idx").on(t.orgId, t.createdAt),
    uniqueIndex("repro_reports_issue_uq")
      .on(t.orgId, t.githubIssueNumber)
      .where(sql`${t.githubIssueNumber} IS NOT NULL`),
  ],
);

export const reportEvents = pgTable(
  "repro_report_events",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id").notNull(),
    orgId: text("org_id").notNull(),
    actor: text("actor", { enum: ["agent", "human", "system"] }).notNull(),
    kind: text("kind").notNull(),
    field: text("field"),
    detail: text("detail"),
    at: text("at").notNull(),
  },
  (t) => [index("repro_report_events_report_idx").on(t.orgId, t.reportId, t.at)],
);
