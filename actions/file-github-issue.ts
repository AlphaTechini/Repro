import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";
import { renderIssueBody, renderIssueTitle } from "../shared/repro/lib/issue-body.js";
import { githubRequest } from "../server/lib/repro/github-app.js";
import { actorFromCtx } from "../server/lib/repro/actor.js";
import {
  claimIssue,
  loadReport,
  logEvent,
  recomputeCompleteness,
} from "../server/lib/repro/reports.js";
import { requireScope } from "../server/lib/repro/scope.js";
import { readReproSettings } from "../server/lib/repro/settings.js";

const LABEL_COLORS: Record<string, string> = {
  repro: "5319e7",
  "severity:low": "c2e0c6",
  "severity:medium": "fbca04",
  "severity:high": "d93f0b",
  "severity:critical": "b60205",
};

async function ensureLabel(installationId: number, repo: string, name: string) {
  try {
    await githubRequest(installationId, "POST", `/repos/${repo}/labels`, {
      name,
      color: LABEL_COLORS[name] ?? "ededed",
    });
  } catch (err) {
    // 422 = label already exists.
    if ((err as { errorCode?: string }).errorCode !== "github_unprocessable") throw err;
  }
}

export default defineAction({
  description:
    "File a complete, ready report as a GitHub issue (as the Repro GitHub App bot) in the repo chosen in Settings, with labels repro and severity:<level>. Idempotent: returns the existing issue if the report was already filed. Requires 100% completeness.",
  schema: z.object({ id: z.string().describe("Report id") }),
  needsApproval: async (_args, ctx) => {
    if (!ctx?.userEmail) return true;
    if (actorFromCtx(ctx) === "human") return false;
    const settings = await readReproSettings(requireScope(ctx));
    return !settings.autoFile;
  },
  link: ({ result }) =>
    result?.url && result?.number
      ? { url: result.url as string, label: `Open issue #${result.number}` }
      : null,
  run: async ({ id }, ctx) => {
    const scope = requireScope(ctx);
    let report = await loadReport(scope, id);
    if (report.githubIssueNumber !== null && report.githubIssueUrl) {
      return {
        number: report.githubIssueNumber,
        url: report.githubIssueUrl,
        alreadyFiled: true,
        message: `Already filed as #${report.githubIssueNumber}.`,
      };
    }

    const settings = await readReproSettings(scope);
    if (settings.githubInstallationId === null || !settings.githubRepo) {
      return fail("Connect GitHub in Settings to file issues.", {
        errorCode: "github_not_connected",
        statusCode: 409,
      });
    }
    const installationId = settings.githubInstallationId;
    const repo = settings.githubRepo;

    report = await recomputeCompleteness(scope, id);
    if (report.completeness < 100) {
      return fail(
        `Report is ${report.completeness}% complete. Missing: ${report.missingFields.join(", ")}.`,
        { errorCode: "incomplete", statusCode: 409, details: { missing: report.missingFields } },
      );
    }
    const title = renderIssueTitle(report);
    if (!title) {
      return fail("Report has no title.", { errorCode: "incomplete", statusCode: 409 });
    }

    const labels = ["repro", ...(report.severity ? [`severity:${report.severity}`] : [])];
    for (const l of labels) await ensureLabel(installationId, repo, l);

    const issue = await githubRequest<{ number: number; html_url: string }>(
      installationId,
      "POST",
      `/repos/${repo}/issues`,
      { title, body: renderIssueBody(report), labels },
    );

    const claimed = await claimIssue(scope, id, {
      number: issue.number,
      url: issue.html_url,
    });
    if (!claimed) {
      // Lost a race: another call already recorded an issue. Return that one.
      const stored = await loadReport(scope, id);
      if (stored.githubIssueNumber !== null && stored.githubIssueUrl) {
        return {
          number: stored.githubIssueNumber,
          url: stored.githubIssueUrl,
          alreadyFiled: true,
          message: `Already filed as #${stored.githubIssueNumber}.`,
        };
      }
    }
    await logEvent(scope, {
      reportId: id,
      actor: actorFromCtx(ctx),
      kind: "filed",
      detail: `${repo}#${issue.number}`,
    });
    return {
      number: issue.number,
      url: issue.html_url,
      alreadyFiled: false,
      message: `Filed ${repo}#${issue.number}.`,
    };
  },
});
