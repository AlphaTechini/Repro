# Repro: Architecture

Repro is a standalone Agent-Native app scaffolded from the official `chat` template (`npx @agent-native/core@latest create repro --standalone --template chat`, core v0.223.0). Everything Repro adds lives in `actions/`, `server/db/`, `app/routes/`, `app/components/repro/` and `.agents/skills/repro/`.

Before writing framework code, read the framework's own guides (they are local, no web needed):

```bash
pnpm action docs-search --list
pnpm action docs-search --slug actions-defining
pnpm action docs-search --slug server-database
pnpm action docs-search --slug client-data
pnpm action docs-search --slug writing-agent-instructions
pnpm action docs-search --slug context-awareness
cat .agents/skills/secrets/SKILL.md
```

## 1. The one rule

Every capability is a `defineAction()` in `actions/`. The React UI calls it with `useActionQuery` / `useActionMutation`, the agent gets it as a tool, and it's also reachable over HTTP, MCP and the CLI (`pnpm action <name>`). No UI-only or agent-only logic paths.

## 2. Data model (SQL via the framework's Drizzle setup)

`reports`

| column | type | notes |
|---|---|---|
| id | text pk | |
| orgId, createdBy | text | from request context |
| clipUrl, recordingId, clipOrigin | text | recordingId = the `<id>` in `/share/<id>` |
| status | text | `draft`, `needs-info`, `ready`, `filed`, `duplicate` |
| title, summary, expected, actual, environment, frequency, severity | text | severity: `low`, `medium`, `high`, `critical` |
| steps | json | string[] |
| errorSignature | text | normalized first console error or failing `METHOD path status`; used for duplicates |
| evidence | json | `{ transcript: Segment[], consoleIssues: [], failedRequests: [], frames: { atMs, label }[], transcriptStatus }` |
| fieldSources | json | `{ [field]: { actor: "agent"|"human", source?: { kind: "transcript"|"console"|"network"|"frame"|"reporter", atMs?, ref? } } }` |
| missingFields | json | string[], last completeness result |
| completeness | int | 0 to 100 |
| followupCount | int | questions the agent asked |
| duplicateOfId | text null | |
| githubIssueNumber, githubIssueUrl | int/text null | unique per report, set once |
| createdAt, clipReadAt, readyAt, filedAt | timestamp | `filedAt - createdAt` = time to fix-ready |

`report_events`: `id, reportId, actor ("agent"|"human"|"system"), kind ("field_set"|"followup_asked"|"clip_read"|"filed"|"duplicate_marked"), field, at`. Source of the metrics.

`settings` (per org): `githubRepo`, `autoFile` (default true), `requiredFields` (default list in PRD R4).

## 3. Actions

| action | does | who calls it |
|---|---|---|
| `create-report` | validate Clips URL, parse recordingId, insert draft, return id | UI (New report), agent |
| `read-clip` | fetch `agent-context.json`, `agent-transcript.json`; pick frame timestamps (first console issue, first failed request, transcript lines with "error/nothing/broken/spins"); store `evidence`; log `clip_read` | agent (first step), UI (Retry) |
| `get-clip-frame` | return a frame image for `atMs` (proxy `agent-frame.jpg`) so the agent can look and the UI can show it | agent, UI |
| `update-report-fields` | patch fields. `actor` comes from the run context (agent vs human). **Agent writes must include `source`; reject otherwise.** Logs `field_set` per field. Re-runs completeness. | agent, UI form |
| `check-report-completeness` | deterministic, no model. Returns `{ percent, missing }`, stores them, sets status `needs-info` / `ready` | agent, UI |
| `record-followups` | stores the questions asked, increments `followupCount` (cap 3 per report) | agent |
| `find-similar-reports` | compare errorSignature and title tokens against open reports in org and open GitHub issues with label `repro` | agent, UI |
| `mark-duplicate` | set `duplicateOfId`, status `duplicate`; append evidence to original; comment on original's GitHub issue if filed | agent, UI |
| `file-github-issue` | build markdown body, POST `/repos/{repo}/issues`, store number and URL, status `filed`. Idempotent: if `githubIssueNumber` set, return it | agent (auto-file), UI (File button) |
| `list-reports`, `get-report` | inbox and detail | UI, agent |
| `get-metrics` | the four PRD §3 metrics per report and totals | UI, agent |
| `export-metrics` | write `evidence/metrics.json` (CLI: `pnpm action export-metrics`) | CLI |
| `get-settings`, `update-settings` | repo, autoFile, requiredFields | UI |

Write actions the agent may call without approval: all except `update-settings` (set `needsApproval` there). `file-github-issue` must not require approval when `autoFile` is on.

## 4. Clips integration

Clips serves agent-readable endpoints for any clip the caller can see (public share link, or a "Share with agents" link that carries `agent_access=<token>`):

| endpoint | used for |
|---|---|
| `GET {origin}/api/agent-context.json?id=<recordingId>[&agent_access=]` | metadata, transcript status, `browserDiagnostics` (`consoleLogs`, `networkRequests`, `consoleIssues`, `failedNetworkRequests`, `timeline`) |
| `GET {origin}/api/agent-transcript.json?id=` | timestamped segments `startMs`, `endMs`, `text` |
| `GET {origin}/api/agent-frame.jpg?id=&atMs=` | one JPEG frame |
| `GET {origin}/api/agent-frames.jpg?id=&startMs=&endMs=&fps=` | contact sheet, max 36 frames / 60 s |

Verified in the Clips template source (`server/routes/api/agent-context.json.get.ts`). Field names must be confirmed against a real clip with `checks/02-clips-agent-context.mjs` before coding `read-clip`; adjust parsing to what it prints. Diagnostics exist only if the clip was recorded with the Clips Chrome extension. Transcripts use Builder.io credits on hosted Clips and may be pending or unavailable; handle `transcriptStatus` honestly.

## 5. GitHub

**Primary: the user's own GitHub identity via a GitHub App.** Issues are filed as the signed-in person, limited to the repos where the Repro GitHub App is installed.

- The framework's GitHub workspace connection (`@agent-native/core/connections`, provider `github`) runs the OAuth web flow against `https://github.com/login/oauth/authorize` with client credentials from `GITHUB_INTEGRATION_CLIENT_ID` / `GITHUB_INTEGRATION_CLIENT_SECRET` (falls back to `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`). Callback path: `/_agent-native/connections/oauth/github/callback`.
- Those credentials come from a **GitHub App** (not an OAuth App). GitHub Apps ignore OAuth scopes: the user token can only do what the app's permissions allow (Issues: read and write; Metadata: read) on repos where the app is installed and the user has access. The framework requests `repo` scope, which an OAuth App would honour as full access; a GitHub App does not.
- The framework's GitHub token exchange does not appear to handle refresh tokens, so in the GitHub App settings turn off "Expire user authorization tokens" (Optional features). Verify during the build: connect, wait, file again.
- `file-github-issue` resolves the token through the connection's scoped resolver (see `.agents/skills/secrets/SKILL.md` and the `workspace-connections` doc) or the provider API runtime (`@agent-native/core/provider-api`, provider `github`). Never read the token into the model's context.

**Fallback: `GITHUB_TOKEN`** (fine-grained, Issues read/write on one repo) for local dev and the capability check, via the connection's `GITHUB_TOKEN` credential key. Issues then show as the token owner.

Repo comes from settings, default `GITHUB_REPO`. Verified by `checks/03-github-issue.mjs` (token path) and build step 5 (GitHub App path).

Issue body template:

```md
## Summary
{summary}

## Steps to reproduce
1. ...

## Expected
{expected}

## Actual
{actual}

## Evidence
- Recording: {clipUrl}?at={seconds} (breaks at {mm:ss})
- Console: `{first console issue}`
- Network: `{METHOD path -> status}`

## Environment
{environment}

**Frequency:** {frequency} · **Severity:** {severity}

<sub>Filed by Repro. Fields marked by the agent are sourced from the recording; the reporter confirmed: {human fields}.</sub>
```

## 6. Agent behaviour

Put the instructions in `.agents/skills/repro/SKILL.md` and reference it from AGENTS.md, following `writing-agent-instructions`. The loop:

1. On a new report: `read-clip`, then `get-clip-frame` for the chosen timestamps if the model supports vision.
2. `update-report-fields` with every field the evidence supports, each with `source`. Never guess expected behaviour or frequency; those come from the reporter.
3. `check-report-completeness`. If missing: one chat message with at most 3 short questions, then `record-followups`.
4. When the reporter answers (chat or form): `update-report-fields` with `actor` human / source `reporter`, re-check.
5. At 100%: `find-similar-reports`. If a strong match, ask "add to existing or file new?" Otherwise, if autoFile: `file-github-issue` and post the link.
6. Never claim an issue was filed without the URL returned by the action.

## 7. UI

- `/reports` Inbox: table (status, title, severity, completeness bar, reporter, issue link, time to fix-ready). New report button.
- `/reports/:id` Detail: left = report form (every field editable; agent-filled fields show a chip "from 0:07" that seeks the embedded Clip or shows the frame); top = completeness bar and status; right = agent sidebar (framework `AgentSidebar`, same thread per report). Embed the Clip player with `https://clips.agent-native.com/embed/<recordingId>?t=<seconds>` if it loads in an iframe; otherwise show frames. (Share pages use `?at=<seconds>`, the embed page uses `?t=<seconds>`; both accept seconds or `m:ss`, per the Clips template's `app/lib/time-param.ts`.)
- `/metrics`: totals and per-report table for PRD §3.
- `/settings` Repro tab: repo, auto-file, required fields.

Follow `DESIGN.md` and `.agents/skills/frontend-design/SKILL.md`. Target 100 ms UI feedback (framework rule).

## 7a. Model

The agent engine is set by env, read by the framework: `AGENT_ENGINE` and `AGENT_MODEL` plus the provider key. Built-in engines include `anthropic`, `ai-sdk:openai`, `ai-sdk:google`, `ai-sdk:groq`, `ai-sdk:openrouter`, `ai-sdk:ollama`. Pick the provider from capability check 1 results. Vision (for frames) is supported on Anthropic, OpenAI and Google engines.

## 8. Deploy

Optional for judging but recommended for a live link. `netlify.toml` comes with the template. Use a free Postgres (Neon or Supabase free tier), set `DATABASE_URL`, a stable `BETTER_AUTH_SECRET`, the model key and `GITHUB_TOKEN`. See `pnpm action docs-search --slug deploy-an-app`.

## 9. Roadmap (not v1)

- Anonymous customer reporting: Clips "Embed" flow. Repro's backend holds a Clips org service token, calls `create-recording-intake-link`, embeds the recorder iframe, receives `agent-native.clips.bug-report.submitted` with `recordingId`, then exchanges it for agent access with `create-intake-agent-link`. Documented in Clips docs `template-clips-embed`.
- Webhook automation: GitHub comment `@repro` triggers a re-check (framework webhook automations).
- Fix PRs via an embedded coding harness.
