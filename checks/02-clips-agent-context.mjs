// Capability check 2: can Repro read a Clip the way its agent needs to?
//
// Repro needs four things from a Clip: the transcript, frames at given timestamps,
// and the browser diagnostics (console errors, failed network requests) that the
// Clips Chrome extension attaches. Clips serves these from agent-readable endpoints:
//   /api/agent-context.json   metadata, transcript status, browserDiagnostics
//   /api/agent-transcript.json timestamped transcript segments
//   /api/agent-frame.jpg       one frame at a timestamp
//
// Run:  node checks/02-clips-agent-context.mjs <clips-share-link>
//
// The link is a public Clips share link (https://clips.agent-native.com/share/<id>)
// or an agent link for a private clip (has ?agent_access=...).
//
// For a meaningful result, record the clip with the Clips Chrome extension on a page
// that throws a console error or has a failing request, so diagnostics exist.

import { mkdir, writeFile } from "node:fs/promises";

const raw = (process.argv[2] || "").trim();
if (!raw) {
  console.error("FAIL: pass a Clips share link: node checks/02-clips-agent-context.mjs <link>");
  process.exit(1);
}

const url = new URL(raw);
const origin = url.origin;
const idFromPath = url.pathname.match(/\/(?:share|r|recording|recordings)\/([^/?#]+)/)?.[1];
const id = url.searchParams.get("id") || idFromPath;
const agentAccess = url.searchParams.get("agent_access");
if (!id) {
  console.error(`FAIL: could not find a recording id in ${raw}`);
  process.exit(1);
}

const qs = (extra = {}) => {
  const p = new URLSearchParams({ id, ...extra });
  if (agentAccess) p.set("agent_access", agentAccess);
  return p.toString();
};

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `: ${detail}` : ""}`);
};

// 1. Agent context
const ctxRes = await fetch(`${origin}/api/agent-context.json?${qs()}`);
const ctxText = await ctxRes.text();
let ctx = null;
try {
  ctx = JSON.parse(ctxText);
} catch {}
check("agent-context.json reachable", ctxRes.ok && !!ctx, `HTTP ${ctxRes.status}`);
if (!ctx) {
  console.log(ctxText.slice(0, 500));
  process.exit(1);
}
console.log(`      top-level keys: ${Object.keys(ctx).join(", ")}`);

// 2. Browser diagnostics
const d = ctx.browserDiagnostics;
const count = (v) => (Array.isArray(v) ? v.length : 0);
check(
  "browserDiagnostics present",
  !!d,
  d
    ? `consoleLogs=${count(d.consoleLogs)} networkRequests=${count(d.networkRequests)} consoleIssues=${count(d.consoleIssues)} failedNetworkRequests=${count(d.failedNetworkRequests)} timeline=${count(d.timeline)}`
    : "null (was the clip recorded with the Chrome extension?)",
);
if (d) {
  const firstIssue = d.consoleIssues?.[0] || d.consoleLogs?.find((l) => l.level === "error");
  if (firstIssue) console.log(`      first console issue: ${JSON.stringify(firstIssue).slice(0, 300)}`);
  const firstFail = d.failedNetworkRequests?.[0];
  if (firstFail) console.log(`      first failed request: ${JSON.stringify(firstFail).slice(0, 300)}`);
}

// 3. Transcript
const trRes = await fetch(`${origin}/api/agent-transcript.json?${qs()}`);
let tr = null;
try {
  tr = await trRes.json();
} catch {}
const segments = tr?.segments || tr?.transcript?.segments || (Array.isArray(tr) ? tr : []);
check(
  "agent-transcript.json has segments",
  trRes.ok && segments.length > 0,
  `HTTP ${trRes.status}, ${segments.length} segments${tr && !segments.length ? `, keys: ${Object.keys(tr).join(", ")}` : ""}`,
);
if (segments[0]) console.log(`      first segment: ${JSON.stringify(segments[0]).slice(0, 300)}`);

// 4. One frame
const atMs = segments[0]?.startMs ?? 1000;
const frRes = await fetch(`${origin}/api/agent-frame.jpg?${qs({ atMs: String(atMs) })}`);
const isJpeg = (frRes.headers.get("content-type") || "").includes("image");
if (frRes.ok && isJpeg) {
  await mkdir(new URL("./out/", import.meta.url), { recursive: true });
  const buf = Buffer.from(await frRes.arrayBuffer());
  await writeFile(new URL("./out/frame.jpg", import.meta.url), buf);
}
check("agent-frame.jpg returns an image", frRes.ok && isJpeg, `HTTP ${frRes.status}, saved to checks/out/frame.jpg`);

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} Clips checks passed.`);
process.exit(passed === results.length ? 0 : 1);
