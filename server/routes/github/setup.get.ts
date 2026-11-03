import { signInJourney } from "@agent-native/core/shared";
import { buildSettingsRoute } from "@agent-native/core/navigation";
import { defineEventHandler, getQuery, redirect } from "h3";
import { getInstallation } from "../../lib/repro/github-app.js";
import { scopeFromSession } from "../../lib/repro/scope.js";
import { readReproSettings, writeReproSettings } from "../../lib/repro/settings.js";

// GitHub App "Setup URL": GitHub redirects here after install with
// installation_id and setup_action.
//
// v1 limitation (ARCHITECTURE §5 step 2): the redirect is not cryptographically
// tied to the signed-in user. Anyone signed in who hits this URL with a valid
// installation_id of this app can attach it to their workspace. The fix is
// GitHub's "Request user authorization (OAuth) during installation" plus
// GET /user/installations to confirm the user can see the installation.
const SETTINGS = buildSettingsRoute("app", "github");

function back(params: Record<string, string>) {
  return redirect(`${SETTINGS}?${new URLSearchParams(params).toString()}`, 302);
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event);
  const scope = await scopeFromSession(event);
  if (!scope) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) {
      if (typeof v === "string") params.set(k, v);
    }
    const { signInHref } = signInJourney({ at: `/github/setup?${params.toString()}` });
    return redirect(signInHref ?? "/sign-in", 302);
  }

  const raw = Array.isArray(q.installation_id) ? q.installation_id[0] : q.installation_id;
  const installationId = Number(raw);
  if (!Number.isSafeInteger(installationId) || installationId <= 0) {
    return back({ github_error: "invalid_installation" });
  }
  try {
    const inst = await getInstallation(installationId);
    const prev = await readReproSettings(scope);
    await writeReproSettings(scope, {
      githubInstallationId: inst.id,
      githubAccount: inst.account?.login ?? null,
      // A different installation invalidates the previously picked repo.
      ...(prev.githubInstallationId !== inst.id ? { githubRepo: null } : {}),
    });
    return back({ github: "connected" });
  } catch (err) {
    const code =
      err && typeof err === "object" && "errorCode" in err
        ? String((err as { errorCode: unknown }).errorCode)
        : "setup_failed";
    return back({ github_error: code });
  }
});
