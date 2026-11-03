import { runMigrations } from "@agent-native/core/db";

// Additive only. Never edit a shipped entry; append a new version.
export default runMigrations(
  [
    {
      version: 1,
      name: "repro-reports",
      sql: `CREATE TABLE IF NOT EXISTS repro_reports (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        owner_email TEXT NOT NULL,
        clip_url TEXT NOT NULL,
        recording_id TEXT NOT NULL,
        clip_origin TEXT NOT NULL,
        agent_thread_id TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        title TEXT,
        summary TEXT,
        steps_json TEXT NOT NULL DEFAULT '[]',
        expected TEXT,
        actual TEXT,
        environment TEXT,
        frequency TEXT,
        severity TEXT,
        error_signature TEXT,
        evidence_json TEXT,
        field_sources_json TEXT NOT NULL DEFAULT '{}',
        missing_fields_json TEXT NOT NULL DEFAULT '[]',
        completeness INTEGER NOT NULL DEFAULT 0,
        followup_count INTEGER NOT NULL DEFAULT 0,
        followup_questions_json TEXT NOT NULL DEFAULT '[]',
        duplicate_of_id TEXT,
        github_issue_number INTEGER,
        github_issue_url TEXT,
        created_at TEXT NOT NULL,
        clip_read_at TEXT,
        ready_at TEXT,
        filed_at TEXT,
        updated_at TEXT NOT NULL
      )`,
    },
    {
      version: 2,
      name: "repro-reports-org-created-idx",
      sql: `CREATE INDEX IF NOT EXISTS repro_reports_org_created_idx ON repro_reports (org_id, created_at)`,
    },
    {
      version: 3,
      name: "repro-reports-issue-unique",
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS repro_reports_issue_uq ON repro_reports (org_id, github_issue_number) WHERE github_issue_number IS NOT NULL`,
    },
    {
      version: 4,
      name: "repro-report-events",
      sql: `CREATE TABLE IF NOT EXISTS repro_report_events (
        id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL,
        org_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        kind TEXT NOT NULL,
        field TEXT,
        detail TEXT,
        at TEXT NOT NULL
      )`,
    },
    {
      version: 5,
      name: "repro-report-events-idx",
      sql: `CREATE INDEX IF NOT EXISTS repro_report_events_report_idx ON repro_report_events (org_id, report_id, at)`,
    },
  ],
  { table: "repro_migrations" },
);
