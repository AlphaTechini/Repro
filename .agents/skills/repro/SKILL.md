---
name: repro
description: >-
  Turns Clips recordings into fix-ready GitHub issues: read the clip, fill sourced fields, ask at most three questions, check duplicates, file. Use when a report is created, a Clips link is pasted, or a reporter answers a follow-up.
scope: runtime
---

# Repro report loop

Every field you write needs evidence. Use the actions below; never invent values.

## Steps

1. **Read the clip.** Call `read-clip` with the report `id`. It returns transcript segments, console issues, failed requests, frame timestamps and `transcriptStatus`. If the report has frames to check, call `get-clip-frame` with `id` and an `atMs` from the frame list.
2. **Fill what the evidence supports.** Call `update-report-fields` with `{ id, changes: [{ field, value, source: { kind, atMs?, ref? } }] }`. Fields: `title`, `summary`, `steps`, `expected`, `actual`, `environment`, `frequency`, `severity`. Use `source.kind` `transcript` (with `atMs` from the segment), `console` or `network` (with `ref` = the diagnostic entry id or quoted text), or `frame` (with `atMs`).
2b. **Set the breaking moment.** When the evidence shows when it fails, call `update-report-fields` with `field: "breaksAt"`, `value: "m:ss"` (e.g. `"0:07"`) and a `console`/`network`/`transcript` source with that entry's `atMs`. `read-clip` suggests the moment but never sets it.
3. **Check completeness.** Call `check-report-completeness` with `{ id }`. It returns `{ percent, missing }`.
4. **Ask only for what is missing.** If `missing` is not empty, send one chat message with at most 3 numbered questions, then call `record-followups` with `{ id, questions }`. Ask only about `missing` fields.
5. **Take the answers.** When the reporter answers in chat, call `update-report-fields` with `source: { kind: "reporter" }`. Then run `check-report-completeness` again.
6. **Check duplicates at 100%.** Call `find-similar-reports` with `{ id }`. On a strong match, ask: "This looks like #N (<title>). Add to the existing report or file a new one?" Wait for the answer. On "add to existing", call `mark-duplicate`.
7. **File.** If `autoFile` is on (see `get-settings`), call `file-github-issue` with `{ id }`. If it is off, tell the reporter the report is ready and a maintainer will file it.
8. **Report the result.** Quote the `githubIssueUrl` returned by the action. Never say an issue was filed without that URL.

## Rules

- **No field without a source.** Every `update-report-fields` change needs `source`. Cite the clip time as `m:ss` in chat, for example "the 500 at 0:09".
- **Never guess expected behaviour or frequency.** Those come from the reporter. Ask.
- **Three questions, one message.** Good follow-up example:

  ```
  I need three things before I can file this:
  1. What did you expect to happen when you clicked Save?
  2. Does it happen every time, or only sometimes?
  3. Which browser and OS were you using?
  ```

  Ask only about fields still in `missing`; never ask about a field the clip already supports.
- **Duplicates.** Ask "add to existing or file new?" before writing anything to GitHub.
- **Filing errors.** If `file-github-issue` returns `errorCode: github_not_connected`, tell the user: "Connect GitHub in Settings → GitHub, then I can file this." Do not retry.
- **Transcript unavailable.** If `transcriptStatus` is not `ready`, say the transcript is unavailable. Rely on frames and diagnostics, and do not fill fields that need spoken detail.
- **Verify after writes.** After `update-report-fields`, `record-followups` or `mark-duplicate`, call `get-report` with `{ id }` and confirm the change before reporting success.

## Failures

Report the action error message as-is, with its `errorCode`. Retry only when the error is transient, and never fill a field to get around a failed read.
