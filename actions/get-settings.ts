import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import type { ReproSettingsView } from "../shared/repro/types.js";
import { getGithubAppConfig, githubInstallUrl } from "../server/lib/repro/github-app.js";
import { requireScope } from "../server/lib/repro/scope.js";
import { readReproSettings } from "../server/lib/repro/settings.js";

export default defineAction({
  description:
    "Get Repro settings: connected GitHub account and repo, auto-file, required fields, and whether the GitHub App is configured on the server.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async (_args, ctx): Promise<ReproSettingsView> => {
    const scope = requireScope(ctx);
    const settings = await readReproSettings(scope);
    return {
      ...settings,
      githubAppConfigured: getGithubAppConfig() !== null,
      githubInstallUrl: githubInstallUrl(),
    };
  },
});
