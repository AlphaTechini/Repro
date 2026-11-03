import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";
import { listInstallationRepos } from "../server/lib/repro/github-app.js";
import { requireScope } from "../server/lib/repro/scope.js";
import { readReproSettings } from "../server/lib/repro/settings.js";

export default defineAction({
  description:
    "List the GitHub repositories the Repro GitHub App can access, for the repo picker.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async (_args, ctx) => {
    const scope = requireScope(ctx);
    const { githubInstallationId } = await readReproSettings(scope);
    if (githubInstallationId === null) {
      return fail("Connect GitHub in Settings to pick a repository.", {
        errorCode: "github_not_connected",
        statusCode: 409,
      });
    }
    return { repos: await listInstallationRepos(githubInstallationId) };
  },
});
