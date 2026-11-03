import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";
import {
  REQUIRABLE_FIELDS,
  type ReproSettings,
  type RequirableField,
} from "../shared/repro/types.js";
import { isRepoSlug, listInstallationRepos } from "../server/lib/repro/github-app.js";
import { requireScope } from "../server/lib/repro/scope.js";
import { readReproSettings, writeReproSettings } from "../server/lib/repro/settings.js";

export default defineAction({
  description:
    "Update Repro settings: the GitHub repo issues are filed to (owner/name), whether ready reports are filed automatically, and which fields are required for a report to count as complete.",
  schema: z.object({
    githubRepo: z.string().optional().describe('Repository as "owner/name"'),
    autoFile: z.boolean().optional(),
    requiredFields: z
      .array(z.string())
      .optional()
      .describe(`Subset of: ${REQUIRABLE_FIELDS.join(", ")}`),
  }),
  needsApproval: true,
  run: async (args, ctx) => {
    const scope = requireScope(ctx);
    const current = await readReproSettings(scope);
    const patch: Partial<ReproSettings> = {};

    if (args.githubRepo !== undefined) {
      const repo = args.githubRepo.trim();
      if (!isRepoSlug(repo)) {
        fail('Repository must look like "owner/name".', {
          errorCode: "invalid_repo",
          statusCode: 400,
        });
      }
      if (current.githubInstallationId !== null) {
        const repos = await listInstallationRepos(current.githubInstallationId);
        const ok = repos.some((r) => r.fullName.toLowerCase() === repo.toLowerCase());
        if (!ok) {
          fail(
            `The Repro GitHub App is not installed on ${repo}. Add it to that repository on GitHub, then pick it again.`,
            { errorCode: "repo_not_in_installation", statusCode: 400 },
          );
        }
      }
      patch.githubRepo = repo;
    }
    if (args.autoFile !== undefined) patch.autoFile = args.autoFile;
    if (args.requiredFields !== undefined) {
      const allowed = new Set<string>(REQUIRABLE_FIELDS);
      const bad = args.requiredFields.filter((f) => !allowed.has(f));
      if (bad.length || args.requiredFields.length === 0) {
        fail(
          bad.length
            ? `Unknown required field: ${bad.join(", ")}.`
            : "At least one field must stay required.",
          { errorCode: "invalid_required_fields", statusCode: 400 },
        );
      }
      patch.requiredFields = Array.from(new Set(args.requiredFields)) as RequirableField[];
    }

    const settings = await writeReproSettings(scope, patch);
    return { settings, message: "Settings updated." };
  },
});
