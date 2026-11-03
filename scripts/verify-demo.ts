/**
 * Repro verify demo. Run with `pnpm demo` (also run by `pnpm verify`).
 *
 * Offline walkthrough of the pure Repro libs: Clips URL parsing, evidence
 * parsing, frame picking, error signatures, the agent source rule,
 * completeness, issue rendering and similarity.
 *
 * All data comes from tests/fixtures (FIXTURE data, not real reports or clips).
 * No network calls, no API keys, no database.
 */
import { readFileSync } from "node:fs";
import { fixtureReport } from "../tests/fixtures/report.fixture.js";
import {
  computeCompleteness,
} from "../shared/repro/lib/completeness.js";
import {
  parseAgentContext,
  parseAgentTranscript,
} from "../shared/repro/lib/clips-parse.js";
import {
  ClipsUrlError,
  parseClipsUrl,
} from "../shared/repro/lib/clips-url.js";
import { computeErrorSignature } from "../shared/repro/lib/error-signature.js";
import { pickFrameTimestamps } from "../shared/repro/lib/frames.js";
import {
  renderIssueBody,
  renderIssueTitle,
} from "../shared/repro/lib/issue-body.js";
import {
  isLikelyDuplicate,
  scoreSimilarity,
} from "../shared/repro/lib/similarity.js";
import { clipLinkAt, formatClipTime } from "../shared/repro/lib/time.js";
import {
  validateChanges,
  type ValidatedChange,
} from "../shared/repro/lib/validate-changes.js";
import {
  DEFAULT_REQUIRED_FIELDS,
  type ClipEvidence,
  type Frequency,
  type FieldProvenance,
  type ReportField,
  type Severity,
} from "../shared/repro/types.js";

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const FIXTURE_DIR = new URL("../tests/fixtures/clips/", import.meta.url);
const FIXTURE_AT = "2026-01-01T00:00:00Z";
const CLIP_TOKEN = "fixture-token";

let checks = 0;

function heading(n: number, text: string): void {
  console.log(`\n${BOLD}${n}. ${text}${RESET}`);
}

function check(ok: boolean, message: string): void {
  if (!ok) throw new Error(`verify demo check failed: ${message}`);
  checks++;
  console.log(`   ok  ${message}`);
}

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(name, FIXTURE_DIR), "utf8"));
}

function printProgress(label: string, percent: number, missing: string[]): void {
  const missingText = missing.length ? missing.join(", ") : "none";
  console.log(`   ${String(percent).padStart(3)}%  ${label}  (missing: ${missingText})`);
}

interface Draft {
  title: string | null;
  summary: string | null;
  steps: string[];
  expected: string | null;
  actual: string | null;
  environment: string | null;
  frequency: Frequency | null;
  severity: Severity | null;
  evidence: ClipEvidence | null;
  fieldSources: Partial<Record<ReportField, FieldProvenance>>;
}

function emptyDraft(): Draft {
  return {
    title: null,
    summary: null,
    steps: [],
    expected: null,
    actual: null,
    environment: null,
    frequency: null,
    severity: null,
    evidence: null,
    fieldSources: {},
  };
}

function applyChanges(draft: Draft, changes: ValidatedChange[]): void {
  for (const c of changes) {
    const v = c.value;
    switch (c.field) {
      case "steps":
        draft.steps = Array.isArray(v) ? v : [];
        break;
      case "frequency":
        draft.frequency = (v as Frequency | null) ?? null;
        break;
      case "severity":
        draft.severity = (v as Severity | null) ?? null;
        break;
      case "title":
      case "summary":
      case "expected":
      case "actual":
      case "environment":
        draft[c.field] = typeof v === "string" ? v : null;
        break;
    }
    draft.fieldSources[c.field] = { ...c.provenance, at: FIXTURE_AT };
  }
}

function mustValidate(changes: Parameters<typeof validateChanges>[0], actor: "agent" | "human"): ValidatedChange[] {
  const r = validateChanges(changes, actor);
  if (!r.ok) throw new Error(`verify demo: unexpected rejection: ${r.message}`);
  return r.changes;
}

function main(): void {
  console.log(`${BOLD}Repro verify demo (fixtures only, no network, no keys)${RESET}`);
  console.log(`${DIM}All data comes from tests/fixtures. These are fixtures, not real reports or clips.${RESET}`);

  // 1. Clips share URL -------------------------------------------------------
  heading(1, "Parse a Clips share URL");
  const shareInput = "https://clips.example.test/share/fixture1?agent_access=" + CLIP_TOKEN;
  const parsed = parseClipsUrl(shareInput);
  console.log(`   input:      ${shareInput}`);
  console.log(`   recording:  ${parsed.recordingId}`);
  console.log(`   origin:     ${parsed.origin}`);
  console.log(`   shareUrl:   ${parsed.shareUrl}`);
  check(parsed.recordingId === "fixture1", "share URL yields recording id fixture1");

  const badUrl = "https://clips.example.test/r/fixture1";
  let badMessage = "";
  try {
    parseClipsUrl(badUrl);
  } catch (err) {
    check(err instanceof ClipsUrlError, "invalid URL throws ClipsUrlError");
    badMessage = (err as Error).message;
  }
  console.log(`   rejected:   ${badUrl}`);
  console.log(`   message:    ${badMessage}`);
  check(badMessage.includes("That isn't a Clips share link"), "invalid URL rejected with the Clips error message");

  // 2. Evidence ----------------------------------------------------------------
  heading(2, "Parse fixture agent-context + transcript into ClipEvidence");
  const context = readFixture("agent-context.fixture.json");
  const transcriptJson = readFixture("agent-transcript.fixture.json");
  const evidence: ClipEvidence = parseAgentContext(context);
  const transcript = parseAgentTranscript(transcriptJson);
  console.log(`   transcript segments: ${evidence.transcript.length}`);
  console.log(`   console issues:      ${evidence.consoleIssues.length}`);
  console.log(`   failed requests:     ${evidence.failedRequests.length}`);
  console.log(`   transcriptStatus:    ${evidence.transcriptStatus}`);
  console.log(`   hasDiagnostics:      ${evidence.hasDiagnostics}`);
  check(evidence.transcript.length === 2, "agent-context carries 2 transcript segments");
  check(evidence.consoleIssues.length === 2, "agent-context carries 2 console issues");
  check(evidence.failedRequests.length === 1, "agent-context carries 1 failed request");
  check(evidence.transcriptStatus === "ready" && evidence.hasDiagnostics, "transcript ready and diagnostics present");
  check(
    transcript.segments.length === 1 &&
      transcript.segments[0]!.startMs === evidence.transcript[0]!.startMs &&
      transcript.segments[0]!.text === evidence.transcript[0]!.text,
    "transcript endpoint agrees with agent-context on the 3000 ms line",
  );

  // 3. Frames -----------------------------------------------------------------
  heading(3, "Pick frame markers");
  const frames = pickFrameTimestamps(evidence);
  evidence.frames = frames;
  for (const f of frames) {
    console.log(`   ${formatClipTime(f.atMs)}  ${f.label}`);
  }
  check(frames.length >= 1 && frames.length <= 4, "1 to 4 frame markers picked");
  check(frames.every((f) => f.atMs >= 0), "frame markers are non-negative");

  // 4. Error signature --------------------------------------------------------
  heading(4, "Compute the error signature");
  const signature = computeErrorSignature(evidence);
  console.log(`   signature: ${signature}`);
  check(typeof signature === "string" && signature.length > 0, "error signature computed");

  // 5. Source rule ------------------------------------------------------------
  heading(5, "Source rule: agent edits must cite a source");
  const rejected = validateChanges([{ field: "title", value: "Save does nothing" }], "agent");
  if (rejected.ok) throw new Error("verify demo: agent change without source was accepted");
  console.log(`   without source: rejected (${rejected.errorCode})`);
  console.log(`   message: ${rejected.message}`);
  check(rejected.errorCode === "source_required", "agent change without source rejected");

  const accepted = validateChanges(
    [{ field: "title", value: "Save does nothing", source: { kind: "transcript", atMs: 3000 } }],
    "agent",
  );
  console.log(`   with source:    ${accepted.ok ? "accepted" : "rejected"} (transcript @ 0:03)`);
  check(accepted.ok, "agent change with transcript source accepted");

  // 6. Completeness -----------------------------------------------------------
  heading(6, "Completeness: empty draft, then sourced fields");
  const draft = emptyDraft();
  const initial = computeCompleteness(draft, DEFAULT_REQUIRED_FIELDS);
  printProgress("empty draft", initial.percent, initial.missing);
  check(initial.percent === 0, "empty draft is 0% complete");

  const batches: { label: string; changes: ValidatedChange[]; attachEvidence?: boolean }[] = [
    {
      label: "agent: title (transcript 0:03) + evidence attached",
      changes: mustValidate(
        [{ field: "title", value: "Save does nothing", source: { kind: "transcript", atMs: 3000 } }],
        "agent",
      ),
      attachEvidence: true,
    },
    {
      label: "agent: actual (network 0:04) + severity (console 0:04)",
      changes: mustValidate(
        [
          { field: "actual", value: "Clicking Save does nothing; the settings request returns HTTP 500.", source: { kind: "network", atMs: 4100 } },
          { field: "severity", value: "high", source: { kind: "console", atMs: 4200 } },
        ],
        "agent",
      ),
    },
    {
      label: "agent: steps from transcript + summary (network 0:04)",
      changes: mustValidate(
        [
          {
            field: "steps",
            value: ["Open the settings page", "Click Save"],
            source: { kind: "transcript", atMs: 3000 },
          },
          { field: "summary", value: "Clicking Save does nothing; the settings request returns HTTP 500.", source: { kind: "network", atMs: 4100 } },
        ],
        "agent",
      ),
    },
    {
      label: "reporter answers: expected, frequency, environment",
      changes: mustValidate(
        [
          { field: "expected", value: "Settings are saved and a confirmation appears." },
          { field: "frequency", value: "always" },
          { field: "environment", value: "FixtureBrowser/1.0" },
        ],
        "human",
      ),
    },
  ];

  let last = initial.percent;
  for (const batch of batches) {
    applyChanges(draft, batch.changes);
    if (batch.attachEvidence) draft.evidence = evidence;
    const r = computeCompleteness(
      { ...draft, fieldSources: draft.fieldSources },
      DEFAULT_REQUIRED_FIELDS,
    );
    printProgress(batch.label, r.percent, r.missing);
    check(r.percent >= last, `completeness does not drop after: ${batch.label}`);
    last = r.percent;
  }
  check(last === 100, "completeness reaches 100%");

  // 7. Render issue -----------------------------------------------------------
  heading(7, "Render the GitHub issue title and body");
  const issueInput = {
    clipUrl: parsed.shareUrl,
    title: draft.title,
    summary: draft.summary,
    steps: draft.steps,
    expected: draft.expected,
    actual: draft.actual,
    environment: draft.environment,
    frequency: draft.frequency,
    severity: draft.severity,
    evidence,
    fieldSources: draft.fieldSources,
  };
  const issueTitle = renderIssueTitle({ title: draft.title });
  const issueBody = renderIssueBody(issueInput);
  console.log(`   title: ${issueTitle}`);
  console.log(`   ----- body -----`);
  console.log(issueBody.replace(/\n$/, "").split("\n").map((l) => `   ${l}`).join("\n"));
  console.log(`   ----- end body -----`);
  check(issueTitle === "Save does nothing", "issue title rendered from the draft");
  check(issueBody.includes("## Steps to reproduce"), "body contains ## Steps to reproduce");
  check(issueBody.includes("1. Open the settings page\n2. Click Save"), "steps are numbered in order");
  const expectedLink = clipLinkAt("https://clips.example.test/share/fixture1", 4100);
  check(expectedLink === "https://clips.example.test/share/fixture1?at=4", "clip link built with at= in seconds");
  check(issueBody.includes(`- Recording: ${expectedLink} (breaks at 0:04)`), "body contains the clip link with ?at=");
  check(!issueBody.includes(CLIP_TOKEN) && !issueBody.includes("agent_access"), "private agent_access token is not in the public body");

  // 8. Similarity -------------------------------------------------------------
  heading(8, "Similarity against two fixture-like candidates");
  const subject = { title: draft.title, errorSignature: signature };
  const sameSignature = {
    title: "Save on settings page fails",
    errorSignature: signature,
  };
  const unrelated = {
    title: fixtureReport.title,
    errorSignature: fixtureReport.errorSignature,
  };
  const scoreA = scoreSimilarity(subject, sameSignature);
  const scoreB = scoreSimilarity(subject, unrelated);
  console.log(`   same signature  "${sameSignature.title}": score ${scoreA.score} (${scoreA.reason})`);
  console.log(`   unrelated       "${unrelated.title}": score ${scoreB.score} (${scoreB.reason})`);
  check(scoreA.score >= 0.9 && isLikelyDuplicate(scoreA.score), "same-signature candidate scores as likely duplicate");
  check(!isLikelyDuplicate(scoreB.score), "unrelated candidate is not a likely duplicate");

  console.log(`\n${BOLD}verify demo: OK (${checks} checks)${RESET}`);
}

try {
  main();
} catch (err) {
  console.error(`\nverify demo: FAILED: ${(err as Error).message}`);
  process.exitCode = 1;
}
