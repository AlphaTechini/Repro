# Repro: Build Plan

Deadline: **Mon Nov 9, 11:59 PM PT = Tue Nov 10, 08:59 WAT.** Submit Nov 9 WAT.

## Already done

- Agent-Native `chat` template at the repo root (core 0.223.0); `pnpm install` and `pnpm typecheck` pass.
- Capability checks in `checks/`. PRD, architecture and setup in `docs/`.

## Order

1. **Build the whole app** with the coding-agent prompt below. It doesn't need any keys to write code; it needs `.env` with a model key to run the agent.
2. **Then test** (owner): fill `.env`, run the two checks, create the GitHub App (docs/SETUP.md), record 3 real bugs, run them end to end.
3. **Nov 8:** README against the judge checklist, deploy, record the public Clips demo.
4. **Nov 9:** buffer, submit, confirm receipt.

The two capability checks (run them as soon as `.env` has a model key):

```bash
node --env-file=.env checks/01-llm-tool-call.mjs                     # model calls tools; what it costs
node checks/02-clips-agent-context.mjs <your-clips-share-link>       # transcript, frames, console/network readable
```

Paste outputs into `evidence/capability-checks.md`. If check 02 prints different field names than ARCHITECTURE.md §4 assumes, fix the parser in `read-clip` to match. The live docs page lists the agent endpoints but not the diagnostics field; the diagnostics come from the Clips source (`server/routes/api/agent-context.json.get.ts` returns `browserDiagnostics`), so check 02 is the proof.

## README audit (Nov 8)

Product explained fully before setup; "Built for Agent-Native Hackathon" with a requirement-to-file table; problem with the sourced numbers in PRD §1; flow step by step; Agent-Native feature-to-file table and what breaks without each; claims table pointing at files, tests and `evidence/`; what's not built; a 30-second judge check (`pnpm verify`, no keys); architecture with file paths; measured results from `evidence/metrics.json`; built-during vs pre-existing; then full setup. Key content in the first ~1,500 words. No judge-directed instructions anywhere in the repo.

---

## Prompt for the coding agent

Paste this whole block into one coding-agent session.

```
You are building Repro in this repository: an Agent-Native app (Builder.io's framework) that turns a Clips screen recording of a bug into a fix-ready GitHub issue. The agent reads the Clip (transcript, frames, console errors, failed requests), fills the report with evidence, asks the reporter only what's missing (max 3 questions), and the Repro GitHub App bot files the issue.

Read first, in this order: AGENTS.md, docs/PRD.md, docs/ARCHITECTURE.md, docs/SETUP.md, DEVELOPING.md. Use the framework's local docs via `pnpm action docs-search --slug <slug>` and the skills in .agents/skills/ before writing framework code; the local docs match the installed version. For Clips, ARCHITECTURE.md §4 lists the endpoints from the Clips docs and source; if evidence/capability-checks.md has real output from checks/02, follow its field names.

Work through these sub-tasks in order. Commit after each with a plain descriptive message (no co-author or tool attribution lines). Run `pnpm typecheck` and `pnpm test` before every commit.

1. Data model: `reports`, `report_events`, `settings` from ARCHITECTURE.md §2, using the framework's database setup (storing-data skill, server-database doc). Add migrations.
2. Actions part 1: `create-report`, `read-clip`, `get-clip-frame`, `update-report-fields`, `check-report-completeness`, `get-report`, `list-reports`, `get-settings`, `update-settings` per ARCHITECTURE.md §3–§4. Agent writes to `update-report-fields` without a `source` are rejected. Completeness is deterministic code. Unit-test completeness, Clips URL parsing, errorSignature normalization, the source rule and Clips response parsing with fixtures in tests/fixtures/ (labelled as fixtures; never imported by app code).
3. Agent: `.agents/skills/repro/SKILL.md` with the loop in ARCHITECTURE.md §6, referenced from AGENTS.md. Engine comes from AGENT_ENGINE / AGENT_MODEL in .env.
4. UI: Inbox /reports, detail /reports/:id (editable form, source chips linking to the Clip moment, completeness bar, Clip embed or frames, agent sidebar on one thread per report), Metrics /metrics, Settings tab. Form and agent edits go through the same actions and show live. Add Reports to the sidebar and make /reports the home path (see CLAUDE.md "Building a domain app"). Follow DESIGN.md and the frontend-design skill.
5. GitHub App per ARCHITECTURE.md §5: Connect GitHub button (install URL from GITHUB_APP_SLUG), /github/setup server route that verifies installation_id with an app JWT and stores it on the org's settings, `list-github-repos` + repo picker, and `file-github-issue` using an installation token (@octokit/auth-app). Idempotent, body template in §5, labels `repro` and `severity:<level>`. Auto-file per settings. If GitHub isn't connected, filing returns a clear "Connect GitHub" error and the UI links to Settings. Private key and tokens never reach the browser or the model.
6. Actions part 2: `record-followups`, `find-similar-reports` (open reports in the org + open issues labelled `repro` in the picked repo), `mark-duplicate`.
7. Metrics: `get-metrics`, `export-metrics` (writes evidence/metrics.json), /metrics page.
8. `pnpm verify`: typecheck, tests, and a no-key demo that runs completeness, Clips parsing and issue-body rendering on the labelled fixtures and prints the result. No external calls.
9. Run `pnpm agent-native:doctor` and fix findings. Update docs/CLAIMS.md with each claim, its file:line and the test that proves it. List anything not built under "Not built".

Rules: no mocks, stubs, hardcoded transcripts, TODO placeholders or fake data in app code. If something can't be built, leave it out and list it in docs/CLAIMS.md. No secrets in the repo. Don't write the final README.

When done, report: what works, what you couldn't verify without keys (model calls, a real Clip, a real GitHub install), and the exact commands the owner should run to test it.
```
