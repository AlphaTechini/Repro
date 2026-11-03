import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";
import {
  breakingMomentMs,
  firstConsoleError,
  firstFailedRequest,
  publicClipUrl,
} from "../shared/repro/lib/issue-body.js";
import { clipLinkAt, formatClipTime } from "../shared/repro/lib/time.js";
import type { ClipEvidence } from "../shared/repro/types.js";
import { actorFromCtx } from "../server/lib/repro/actor.js";
import { githubRequest } from "../server/lib/repro/github-app.js";
import { listReports, loadReport, logEvent, patchReport } from "../server/lib/repro/reports.js";
import { requireScope } from "../server/lib/repro/scope.js";
import { readReproSettings } from "../server/lib/repro/settings.js";

function mergeBy<T>(a: T[], b: T[], key: (x: T) => string): { merged: T[]; added: number } {
  const seen = new Set(a.map(key));
  const merged = [...a];
  let added = 0;
  for (const x of b) {
    const k = key(x);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(x);
    added++;
  }
  return { merged, added };
}

export default defineAction({
  description:
    "Mark a report as a duplicate of another report (duplicateOfId) or of an existing GitHub issue (duplicateOfIssueNumber). Merges this report's evidence into the original and comments on the original's GitHub issue with a link to this Clip.",
  schema: z.object({
    id: z.string().describe("The duplicate report id"),
    duplicateOfId: z.string().optional().describe("Original report id"),
    duplicateOfIssueNumber: z.coerce.number().int().positive().optional().describe("Original GitHub issue number"),
  }),
  run: async (args, ctx) => {
    const scope = requireScope(ctx);
    const actor = actorFromCtx(ctx);
    if (!args.duplicateOfId && !args.duplicateOfIssueNumber) {
      return fail("Provide duplicateOfId or duplicateOfIssueNumber.", {
        errorCode: "invalid_args",
        statusCode: 400,
      });
    }
    const dupe = await loadReport(scope, args.id);

    let original = args.duplicateOfId ? await loadReport(scope, args.duplicateOfId) : null;
    if (!original && args.duplicateOfIssueNumber) {
      const all = await listReports(scope, { limit: 500 });
      original = all.find((r) => r.githubIssueNumber === args.duplicateOfIssueNumber) ?? null;
    }
    if (original && original.id === dupe.id) {
      return fail("A report cannot be a duplicate of itself.", {
        errorCode: "invalid_args",
        statusCode: 400,
      });
    }
    if (original && original.status === "duplicate") {
      return fail("That report is itself a duplicate. Pick the original.", {
        errorCode: "invalid_args",
        statusCode: 400,
      });
    }
    const issueNumber = args.duplicateOfIssueNumber ?? original?.githubIssueNumber ?? null;

    if (original) {
      await patchReport(scope, dupe.id, { duplicateOfId: original.id, status: "duplicate" });
    } else {
      await patchReport(scope, dupe.id, { status: "duplicate" });
    }
    await logEvent(scope, {
      reportId: dupe.id,
      actor,
      kind: "duplicate_marked",
      detail: original ? `of ${original.id}` : `of issue #${issueNumber}`,
    });

    if (original && dupe.evidence) {
      const de = dupe.evidence;
      const oe: ClipEvidence = original.evidence ?? {
        ...de,
        consoleIssues: [],
        failedRequests: [],
        frames: [],
      };
      const c = mergeBy(oe.consoleIssues, de.consoleIssues, (x) => `${x.id}|${x.message}`);
      const n = mergeBy(oe.failedRequests, de.failedRequests, (x) => `${x.id}|${x.method} ${x.path}`);
      const f = mergeBy(oe.frames, de.frames, (x) => `${x.atMs}|${x.label}`);
      await patchReport(scope, original.id, {
        evidence: {
          ...oe,
          consoleIssues: c.merged,
          failedRequests: n.merged,
          frames: f.merged,
          hasDiagnostics: oe.hasDiagnostics || de.hasDiagnostics,
        },
      });
      await logEvent(scope, {
        reportId: original.id,
        actor,
        kind: "evidence_merged",
        detail: `from ${dupe.id}: ${c.added} console, ${n.added} network, ${f.added} frames`,
      });
    }

    let commentUrl: string | null = null;
    let commentError: string | null = null;
    const settings = await readReproSettings(scope);
    if (issueNumber !== null && settings.githubInstallationId !== null && settings.githubRepo) {
      const at = breakingMomentMs(dupe);
      const base = publicClipUrl(dupe.clipUrl);
      const lines = [
        `Another report hit this${dupe.title ? `: "${dupe.title.replace(/\s+/g, " ").trim()}"` : ""}.`,
        "",
        at !== null
          ? `- Recording: ${clipLinkAt(base, at)} (breaks at ${formatClipTime(at)})`
          : `- Recording: ${base}`,
      ];
      const con = firstConsoleError(dupe);
      if (con?.message) lines.push(`- Console: \`${con.message.replace(/\s+/g, " ").replace(/`/g, "'").slice(0, 300)}\``);
      const req = firstFailedRequest(dupe);
      if (req && req.status !== null) lines.push(`- Network: \`${req.method.toUpperCase()} ${req.path} -> ${req.status}\``);
      lines.push("", "<sub>Added by Repro as a duplicate report.</sub>");
      try {
        const r = await githubRequest<{ html_url: string }>(
          settings.githubInstallationId,
          "POST",
          `/repos/${settings.githubRepo}/issues/${issueNumber}/comments`,
          { body: lines.join("\n") },
        );
        commentUrl = r.html_url;
      } catch (err) {
        commentError = err instanceof Error ? err.message : "GitHub comment failed.";
      }
    }

    return {
      originalId: original?.id ?? null,
      commentUrl,
      ...(commentError ? { commentError } : {}),
      message: original
        ? `Marked as a duplicate of ${original.id}.`
        : `Marked as a duplicate of issue #${issueNumber}.`,
    };
  },
});
