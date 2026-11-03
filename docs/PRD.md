# Repro: Product Requirements

**One line:** Repro turns "it's broken" into a fix-ready GitHub issue in one sitting. You record the bug with Clips, Repro's agent watches it, asks you only what's missing, and files the issue.

**Built for:** Builder.io Agent-Native Hackathon (Oct 27 to Nov 9, 2026). Deadline: Mon Nov 9, 11:59 PM PT (Nov 10, 07:59 UTC).

---

## 1. Problem

Bug reports arrive incomplete, and the missing details are only known by the person who reported them. Developers ask for them days later, the reporter has moved on, and the bug is closed as "can't reproduce."

- In a 2023 study of Android app bug reports, 92.2% had at least one missing step to reproduce. ([arXiv 2301.01235](https://arxiv.org/pdf/2301.01235))
- 41% of developers named reproducing a bug as the biggest barrier to fixing bugs faster (Undo / Cambridge Judge Business School research, 2020, vendor-funded). ([undo.io](https://undo.io/?p=4660))
- In the AI era the bug report is the coding agent's prompt. 65% of developers say they spend time correcting AI-generated work that missed the original intent (Atlassian State of Developer Experience 2026). ([InfoQ](https://infoq.com/news/2026/10/atlassian-devex-2026))

Use these exact numbers and sources in the README. Do not invent others.

## 2. Users

| User | Who | What they need |
|---|---|---|
| Reporter | Support, QA, PM, designer, or a developer on the team. Signed in to Repro. | Report a bug once, without knowing what a "good bug report" needs. |
| Maintainer | The developer who fixes it. Same Repro org. | An issue they can act on without a back-and-forth. |

Out of scope for v1: anonymous external customers. (Roadmap: the Clips embed intake flow, see ARCHITECTURE.md §9.)

## 3. The job, and how we score it

Builder.io's own guidance: score against the job, not against an incumbent. Repro's job is **a fix-ready issue with the least human effort.** Repro measures, per report:

1. **Time to fix-ready:** from Clip pasted to issue filed.
2. **Follow-up questions asked:** how many the agent needed (target 3 or fewer).
3. **Fields filled by the agent vs edited by a human.**
4. **Completeness:** required fields present at filing (target 100%).

These numbers are shown in the app (Metrics) and exported to `evidence/`.

## 4. Core flow (v1)

1. **Record.** Reporter records the bug with the Clips Chrome extension (it captures console errors and failed network requests) and copies the share link.
2. **Paste.** Reporter clicks **New report** in Repro and pastes the link. A report draft opens beside the agent chat.
3. **Agent reads the Clip.** The agent calls `read-clip`: transcript, frames at key moments, console issues, failed requests. It fills the draft fields it can support with evidence, each with the Clip timestamp it came from. The draft updates live on screen.
4. **Agent asks only what's missing.** `check-report-completeness` lists missing required fields. The agent asks at most 3 short follow-up questions in chat, in one message. The reporter can answer in chat or type straight into the form; both write the same record.
5. **Duplicate check.** `find-similar-reports` compares the error signature and title against open reports and open GitHub issues labelled `repro`. If there's a likely match, the agent says so and the reporter chooses: add to existing, or file new.
6. **File.** When completeness is 100%, `file-github-issue` creates the issue (auto-file is on by default; a setting turns it off so a maintainer approves first). The issue links the Clip at the exact timestamp where it breaks.
7. **Inbox.** Maintainers see every report with status, severity, completeness and metrics, and can edit and file manually with the same action.

## 5. Requirements

### Must have (judged demo depends on these)

| ID | Requirement | Acceptance |
|---|---|---|
| R1 | Create a report from a Clips share link | Pasting a valid link creates a report row and opens it. Invalid or inaccessible links show a clear error. |
| R2 | Read the Clip | `read-clip` stores transcript segments, console issues, failed requests and 1 to 4 frame timestamps on the report. Works on a real public Clip recorded with the extension. |
| R3 | Agent drafts fields with evidence | Title, actual behaviour, steps, error, environment are filled where the Clip supports them. Each agent-filled field stores its source (transcript timestamp or diagnostic entry). No field is filled without a source. |
| R4 | Completeness check | Deterministic (no model): required fields = title, steps (2 or more), expected, actual, frequency, severity, environment, evidence timestamp. Returns missing list and percent. |
| R5 | Follow-up questions | Agent asks only for missing fields, max 3 questions, one message. Answers update the report. |
| R6 | Shared editing | Reporter edits in the form and agent edits via actions update the same row; UI reflects agent edits live. Each change is logged as `agent` or `human`. |
| R7 | File GitHub issue | Creates the issue in the configured repo with a structured body (Summary, Steps, Expected, Actual, Evidence with Clip timestamp link, Console, Network, Environment, Frequency, Severity) and labels `repro` and `severity:<level>`. Stores number and URL. Never files twice for one report. |
| R8 | Auto-file setting | On by default. Off means status `ready` and a maintainer clicks File. |
| R9 | Inbox | List of reports with status (`draft`, `needs-info`, `ready`, `filed`, `duplicate`), severity, completeness, created by, issue link. |
| R10 | Metrics | Per report and totals for the four metrics in §3. Export to `evidence/metrics.json` via an action. |

### Should have

| ID | Requirement |
|---|---|
| S1 | Duplicate detection against open reports and open `repro` GitHub issues (title + error signature). |
| S2 | "Add to existing report" merges evidence into the original and comments on its GitHub issue. |
| S3 | Settings page: GitHub repo, auto-file toggle, required fields. |

### Won't have in v1

- Opening pull requests or writing fixes.
- Anonymous external reporters, embedded recorder.
- Slack/email intake.

## 6. Evidence plan (decide now, hold to it)

Everything shown in the demo must be real:

1. At least **3 real bugs** recorded with the Clips Chrome extension on real apps (the maintainer's own apps, or a public open-source web app), each with a real console error or failed request.
2. Each runs end to end: Clip pasted, follow-ups answered, **real GitHub issue filed** in a public demo repo.
3. Metrics for those runs are exported to `evidence/metrics.json` and quoted in the README.
4. The public Clips demo video shows one full run with no cuts in the agent's work.

No mocked Clip data, hardcoded transcripts or fake issues anywhere in the app. Test fixtures live only under `tests/fixtures/` and are labelled as fixtures.

## 7. How this maps to the judging rubric

| Criterion (weight) | How Repro answers it |
|---|---|
| Usefulness and Execution (40%) | A real, common problem with sourced numbers; one complete flow from recording to filed issue; measured time and effort per report. |
| Creativity and Design (20%) | The report fills itself in front of you while the agent asks only what's missing. Every agent-filled field links to the Clip moment that proves it. |
| Innovation (20%) | People and agent split the work by who knows what: the agent extracts what the recording shows, the human supplies intent only they know. |
| Cleverness and Use of Agent-Native (20%) | One set of actions powers the form, the agent, the inbox and the CLI. Live sync shows agent edits on screen. Reads Clips through its agent-readable endpoints. |

## 8. Demo script (about 2 minutes)

1. Show a real app with a real bug. Record it with the Clips extension (10 seconds, narrate "Save does nothing").
2. Paste the link in Repro. The draft fills itself: title, steps, the console TypeError, the 500 response, each with a timestamp chip.
3. The agent asks two questions: what did you expect, does it happen every time. Answer one in chat, type the other into the form.
4. Completeness hits 100%, the issue is filed. Open it on GitHub: structured, linked to the Clip at the failing second.
5. Show Metrics: time to fix-ready, questions asked, agent vs human fields across the 3 real bugs.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Model provider cost (no-spend rule) | Capability check 1 decides the provider before building. Fallback: Gemini free key. |
| Clips agent endpoints differ from docs | Capability check 2 runs against a real Clip before building `read-clip`. |
| Builder free credits pause Clips transcripts | Transcript may be missing; agent still uses frames and diagnostics, and says the transcript is unavailable. |
| Model fills fields without evidence | R3 rule enforced in the action: reject agent writes without a `source`. |
| Time (submission Nov 9) | Must-haves only until R1 to R10 pass; README and demo video start Nov 8. |
