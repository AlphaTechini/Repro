// Capability check 3: can Repro open (and close) a GitHub issue with the token you plan to use?
//
// Run:  node --env-file=.env checks/03-github-issue.mjs
//
// Env:
//   GITHUB_TOKEN  fine-grained token with "Issues: Read and write" on the target repo
//   GITHUB_REPO   owner/name of a repo you own (use a test repo, not a real project)
//
// The script creates one issue labelled "repro-check", reads it back, then closes it.

const token = process.env.GITHUB_TOKEN;
const repo = (process.env.GITHUB_REPO || "").trim();
if (!token || !/^[^/]+\/[^/]+$/.test(repo)) {
  console.error("FAIL: set GITHUB_TOKEN and GITHUB_REPO (owner/name).");
  process.exit(1);
}

const gh = async (method, path, body) => {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "repro-capability-check",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${json.message || ""}`);
  return json;
};

try {
  const created = await gh("POST", `/repos/${repo}/issues`, {
    title: "[repro-check] capability check issue",
    body: [
      "## Steps to reproduce",
      "1. Open the profile page",
      "2. Click Save",
      "",
      "## Expected",
      "Profile saves and a toast appears.",
      "",
      "## Actual",
      "Button spins; `POST /api/profile` returns 500.",
      "",
      "_Created by Repro's capability check. Safe to ignore; it closes itself._",
    ].join("\n"),
    labels: ["repro-check"],
  });
  console.log(`PASS  created issue #${created.number}: ${created.html_url}`);

  const fetched = await gh("GET", `/repos/${repo}/issues/${created.number}`);
  console.log(`PASS  read back issue #${fetched.number} (state=${fetched.state}, labels=${fetched.labels.map((l) => l.name).join(",")})`);

  await gh("PATCH", `/repos/${repo}/issues/${created.number}`, { state: "closed", state_reason: "not_planned" });
  console.log(`PASS  closed issue #${created.number}`);
  process.exit(0);
} catch (err) {
  console.error(`FAIL  ${err.message}`);
  process.exit(1);
}
