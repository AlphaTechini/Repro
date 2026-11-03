import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import {
  isLikelyDuplicate,
  rankCandidates,
  type SimilarityInput,
} from "../shared/repro/lib/similarity.js";
import { githubRequest } from "../server/lib/repro/github-app.js";
import { listReports, loadReport } from "../server/lib/repro/reports.js";
import { requireScope } from "../server/lib/repro/scope.js";
import { readReproSettings } from "../server/lib/repro/settings.js";

type Item =
  | { kind: "report"; id: string; title: string | null; status: string; githubIssueNumber: number | null; githubIssueUrl: string | null }
  | { kind: "issue"; number: number; title: string; url: string };

export default defineAction({
  description:
    "Find likely duplicates of a report among the team's other open reports and open GitHub issues labelled repro. Compares error signature and title words. Returns the top 5 with score and reason.",
  schema: z.object({ id: z.string().describe("Report id") }),
  http: { method: "GET" },
  run: async ({ id }, ctx) => {
    const scope = requireScope(ctx);
    const report = await loadReport(scope, id);
    const subject: SimilarityInput = {
      title: report.title,
      errorSignature: report.errorSignature,
    };

    const pool: { item: Item; input: SimilarityInput }[] = [];
    const seenIssues = new Set<number>();
    for (const r of await listReports(scope, { limit: 300 })) {
      if (r.id === id || r.status === "duplicate") continue;
      if (r.githubIssueNumber !== null) seenIssues.add(r.githubIssueNumber);
      pool.push({
        item: {
          kind: "report",
          id: r.id,
          title: r.title,
          status: r.status,
          githubIssueNumber: r.githubIssueNumber,
          githubIssueUrl: r.githubIssueUrl,
        },
        input: { title: r.title, errorSignature: r.errorSignature },
      });
    }

    let githubChecked = false;
    const settings = await readReproSettings(scope);
    if (settings.githubInstallationId !== null && settings.githubRepo) {
      try {
        const issues = await githubRequest<
          { number: number; title: string; html_url: string; pull_request?: unknown }[]
        >(
          settings.githubInstallationId,
          "GET",
          `/repos/${settings.githubRepo}/issues?labels=repro&state=open&per_page=100`,
        );
        githubChecked = true;
        for (const i of issues) {
          if (i.pull_request || seenIssues.has(i.number)) continue;
          if (report.githubIssueNumber === i.number) continue;
          pool.push({
            item: { kind: "issue", number: i.number, title: i.title, url: i.html_url },
            input: { title: i.title, errorSignature: null },
          });
        }
      } catch {
        // GitHub unavailable: fall back to report-only matching.
      }
    }

    const ranked = rankCandidates(pool, subject, { limit: 5 });
    const candidates = ranked.map((c) => ({ ...c.item, score: c.score, reason: c.reason }));
    return {
      candidates,
      likelyDuplicate: isLikelyDuplicate(candidates[0]?.score),
      githubChecked,
    };
  },
});
