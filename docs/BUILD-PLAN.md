# Repro: Build Plan

Deadline: **Mon Nov 9, 11:59 PM PT = Tue Nov 10, 08:59 WAT.** Aim to submit by Nov 9 evening WAT.

## Done already (Nov 3)

- Agent-Native `chat` template scaffolded at the repo root (core 0.223.0). `pnpm install` and `pnpm typecheck` pass.
- Capability checks written in `checks/`.
- PRD and architecture in `docs/`.

## Step 0: run the capability checks (owner, before any feature code)

```bash
cp .env.example .env     # fill in keys
node --env-file=.env checks/01-llm-tool-call.mjs        # model calls tools? cost?
node --env-file=.env checks/02-clips-agent-context.mjs  # Clip readable? diagnostics present?
node --env-file=.env checks/03-github-issue.mjs         # token can open + close an issue?
```

Record each result in `evidence/capability-checks.md` (paste the output). Decisions they drive:

| check | if it passes | if it fails |
|---|---|---|
| 01 OpenAI | use `ai-sdk:openai` + `gpt-5.4-mini` if the dashboard shows the runs as free | try Gemini free key; Haiku as paid backup |
| 02 Clips | build `read-clip` against the printed field names | if diagnostics are null, re-record with the Chrome extension; if endpoints 404, stop and report |
| 03 GitHub | build `file-github-issue` as specified | fix token scope (Issues: read and write) |

## Day plan

| day | goal | done when |
|---|---|---|
| Nov 4 | Data model, settings, `create-report`, `read-clip`, `get-clip-frame`, `update-report-fields`, `check-report-completeness` | `pnpm action read-clip --reportId ...` on a real Clip stores evidence; unit tests for completeness pass |
| Nov 5 | Agent skill + loop, report detail page with live form and agent sidebar, follow-ups | Pasting a real Clip produces a drafted report and at most 3 questions; answering fills fields |
| Nov 6 | `file-github-issue`, auto-file, Inbox, duplicates | A real issue is filed end to end from the UI; second file attempt returns the same issue |
| Nov 7 | Metrics, export, 3 real bugs recorded and run end to end | `evidence/metrics.json` has 3 real runs; issues exist on GitHub |
| Nov 8 | README (judge-ready), docs/CLAIMS.md, deploy, record public Clips demo | README audit passes (see below); live URL works |
| Nov 9 | Buffer, fixes, submit, confirm receipt | Submission form confirmed |

## README audit (Nov 8)

The README must follow the owner's AI-judge checklist: product explained fully before setup; "Built for Agent-Native Hackathon" with a requirement-to-file table; problem with the sourced numbers in PRD §1; flow step by step; Agent-Native feature-to-file table and what breaks without each; claims table pointing at files, tests and `evidence/`; what's not built; a 30-second judge check (`pnpm verify`: install, typecheck, tests, and a no-key demo using recorded fixtures clearly labelled as fixtures); architecture with file paths; measured results from `evidence/metrics.json`; built-during vs pre-existing (the `chat` template is pre-existing boilerplate); then full setup. Key content within the first ~1,500 words. No judge-directed instructions in the repo.

---

## Prompt for the coding agent

Paste this whole block into one coding-agent session.

```
You are building Repro in this repository. Repro is an Agent-Native app (Builder.io's framework) that turns a Clips screen recording of a bug into a fix-ready GitHub issue: the agent reads the Clip, fills the report with evidence, asks the reporter only what's missing (max 3 questions), and files the issue.

Read first, in this order: AGENTS.md, docs/PRD.md, docs/ARCHITECTURE.md, docs/BUILD-PLAN.md, evidence/capability-checks.md (results of the capability checks; follow its decisions), DEVELOPING.md. Use the framework's local docs via `pnpm action docs-search --slug <slug>` and the skills in .agents/skills/ before writing framework code. Do not web-search framework APIs; the local docs and source match the installed version.

Work through these sub-tasks in order. Commit after each one with a plain, descriptive message (no co-author or tool attribution lines). Run `pnpm typecheck` and `pnpm test` before every commit.

1. Data model: add the `reports`, `report_events` and `settings` tables from docs/ARCHITECTURE.md §2 using the framework's database setup (see `storing-data` skill and `server-database` doc). Add migrations.
2. Actions, part 1: `create-report`, `read-clip`, `get-clip-frame`, `update-report-fields`, `check-report-completeness`, `get-report`, `list-reports`, `get-settings`, `update-settings`, exactly as specified in ARCHITECTURE.md §3 and §4. Parse Clips responses using the field names recorded in evidence/capability-checks.md. Enforce: agent writes to `update-report-fields` without a `source` are rejected. Completeness is deterministic code, no model. Unit-test completeness, URL parsing, errorSignature normalization and the source rule with fixtures under tests/fixtures/ (labelled as fixtures; never used by app code).
3. Agent: write `.agents/skills/repro/SKILL.md` with the loop in ARCHITECTURE.md §6 and reference it from AGENTS.md. Configure the engine from env (`AGENT_ENGINE`, `AGENT_MODEL`).
4. UI: Inbox at /reports, detail at /reports/:id with the editable form, source chips that link to the Clip moment, completeness bar, Clip embed or frames, and the agent sidebar on the same thread per report. Form edits and agent edits go through the same actions and appear live. Follow DESIGN.md and the frontend-design skill.
5. Actions, part 2: `record-followups`, `find-similar-reports`, `mark-duplicate`, `file-github-issue` (idempotent, body template in ARCHITECTURE.md §5, labels `repro` and `severity:<level>`), auto-file behaviour per settings. GitHub auth per ARCHITECTURE.md §5: the user's GitHub workspace connection backed by the Repro GitHub App (`GITHUB_INTEGRATION_CLIENT_ID/SECRET`), with `GITHUB_TOKEN` as fallback; the token never enters the model's context. Test it for real: connect GitHub in the running app, file an issue, confirm on GitHub that the author is the signed-in user, and confirm a repo where the app is NOT installed is refused. Record the result in evidence/github-auth.md.
6. Metrics: `get-metrics`, `export-metrics` (writes evidence/metrics.json), /metrics page.
7. `pnpm verify` script: install check, typecheck, tests, and a no-key demo that runs completeness and issue-body rendering on the labelled fixtures and prints the result. It must not call any external service.
8. Update docs/CLAIMS.md with each claim, the file:line that implements it and the test or evidence file that proves it.

Rules: no mocks, stubs, hardcoded transcripts, TODO placeholders or fake data in app code. If something can't be built, leave it out and list it under "Not built" in docs/CLAIMS.md. Never put secrets in the repo; use .env and the framework's secrets mechanism. Don't write the final README; the owner does that on Nov 8.
```
