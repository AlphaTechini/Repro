// Server-only. GitHub App identity is deployment config; tokens and keys never
// leave this module (not logged, not returned, not put in error text).
import { fail } from "@agent-native/core/action";
import { createAppAuth } from "@octokit/auth-app";

export interface GithubAppConfig {
  appId: string;
  slug: string;
  privateKey: string;
}

export function getGithubAppConfig(): GithubAppConfig | null {
  // guard:allow-env-credential — deployment-owned GitHub App id
  const appId = process.env.GITHUB_APP_ID;
  // guard:allow-env-credential — deployment-owned GitHub App slug (public)
  const slug = process.env.GITHUB_APP_SLUG;
  // guard:allow-env-credential — deployment-owned GitHub App private key
  const rawKey = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!appId || !slug || !rawKey) return null;
  return { appId, slug, privateKey: rawKey.replace(/\\n/g, "\n") };
}

export function githubInstallUrl(): string | null {
  const cfg = getGithubAppConfig();
  return cfg ? `https://github.com/apps/${cfg.slug}/installations/new` : null;
}

function requireConfig(): GithubAppConfig {
  const cfg = getGithubAppConfig();
  if (!cfg) {
    return fail("GitHub App is not configured on this server.", {
      errorCode: "github_app_not_configured",
      statusCode: 409,
    });
  }
  return cfg;
}

let cachedAuth: { key: string; auth: ReturnType<typeof createAppAuth> } | null =
  null;
function appAuth(cfg: GithubAppConfig) {
  const key = `${cfg.appId}:${cfg.privateKey.length}`;
  if (!cachedAuth || cachedAuth.key !== key) {
    cachedAuth = {
      key,
      auth: createAppAuth({ appId: cfg.appId, privateKey: cfg.privateKey }),
    };
  }
  return cachedAuth.auth;
}

const API = "https://api.github.com";
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const tokenCache = new Map<number, { token: string; expiresAt: number }>();

function headers(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Repro",
    Authorization: `Bearer ${token}`,
  };
}

async function appJwt(): Promise<string> {
  const cfg = requireConfig();
  try {
    return (await appAuth(cfg)({ type: "app" })).token;
  } catch {
    return fail(
      "Could not sign in as the GitHub App. Check GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY.",
      { errorCode: "github_auth_failed", statusCode: 502 },
    );
  }
}

async function send(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers:
        body === undefined
          ? headers(token)
          : { ...headers(token), "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    return fail("Could not reach GitHub. Try again in a moment.", {
      errorCode: "github_unreachable",
      statusCode: 502,
    });
  }
  if (res.ok) {
    if (res.status === 204) return null;
    return res.json();
  }
  let detail = "";
  try {
    const j = (await res.json()) as { message?: string };
    detail = j.message ? ` (${j.message})` : "";
  } catch {
    /* ignore */
  }
  if (res.status === 401) {
    return fail("GitHub rejected the Repro app credentials.", {
      errorCode: "github_unauthorized",
      statusCode: 502,
    });
  }
  if (res.status === 403) {
    return fail(
      `GitHub denied this request. The Repro app needs Issues: read and write on this repo, or the rate limit was hit${detail}.`,
      { errorCode: "github_forbidden", statusCode: 403 },
    );
  }
  if (res.status === 404) {
    return fail(
      "GitHub could not find that repository or installation. Reconnect GitHub in Settings and make sure the app can access the repo.",
      { errorCode: "github_not_found", statusCode: 404 },
    );
  }
  if (res.status === 422) {
    return fail(`GitHub rejected the data${detail}.`, {
      errorCode: "github_unprocessable",
      statusCode: 422,
    });
  }
  return fail(`GitHub returned an error (${res.status}).`, {
    errorCode: "github_error",
    statusCode: 502,
  });
}

/** App-level lookup of an installation (verifies it exists). */
export async function getInstallation(
  installationId: number,
): Promise<{ id: number; account: { login: string } | null }> {
  const jwt = await appJwt();
  const j = (await send(jwt, "GET", `/app/installations/${installationId}`)) as {
    id: number;
    account?: { login?: string } | null;
  };
  return {
    id: j.id,
    account: j.account?.login ? { login: j.account.login } : null,
  };
}

export async function getInstallationToken(
  installationId: number,
): Promise<string> {
  const hit = tokenCache.get(installationId);
  if (hit && hit.expiresAt - REFRESH_MARGIN_MS > Date.now()) return hit.token;
  const cfg = requireConfig();
  try {
    const r = await appAuth(cfg)({ type: "installation", installationId });
    const expiresAt = r.expiresAt ? Date.parse(r.expiresAt) : Date.now() + 3600_000;
    tokenCache.set(installationId, { token: r.token, expiresAt });
    return r.token;
  } catch {
    return fail(
      "Could not get a GitHub installation token. Reconnect GitHub in Settings.",
      { errorCode: "github_auth_failed", statusCode: 502 },
    );
  }
}

export async function githubRequest<T = unknown>(
  installationId: number,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getInstallationToken(installationId);
  return (await send(token, method, path, body)) as T;
}

export interface InstallationRepo {
  fullName: string;
  private: boolean;
  htmlUrl: string;
}

/** Repositories the installation can access (up to 300). */
export async function listInstallationRepos(
  installationId: number,
): Promise<InstallationRepo[]> {
  const out: InstallationRepo[] = [];
  for (let page = 1; page <= 3; page++) {
    const r = await githubRequest<{
      repositories?: { full_name: string; private: boolean; html_url: string }[];
    }>(installationId, "GET", `/installation/repositories?per_page=100&page=${page}`);
    const repos = r.repositories ?? [];
    for (const x of repos) {
      out.push({ fullName: x.full_name, private: x.private, htmlUrl: x.html_url });
    }
    if (repos.length < 100) break;
  }
  return out;
}

export function isRepoSlug(v: string): boolean {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(v);
}
