// Tests for pure Repro libs. Fixtures under tests/fixtures are FIXTURE data.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { computeCompleteness } from "../../shared/repro/lib/completeness";
import { parseAgentContext, parseAgentTranscript } from "../../shared/repro/lib/clips-parse";
import { ClipsUrlError, parseClipsUrl } from "../../shared/repro/lib/clips-url";
import { computeErrorSignature } from "../../shared/repro/lib/error-signature";
import { pickFrameTimestamps } from "../../shared/repro/lib/frames";
import { clipLinkAt, formatClipTime } from "../../shared/repro/lib/time";
import { validateChanges } from "../../shared/repro/lib/validate-changes";
import type { ClipEvidence } from "../../shared/repro/types";

const fx = (n: string) => JSON.parse(readFileSync(new URL(`../fixtures/clips/${n}`, import.meta.url), "utf8"));
const empty: ClipEvidence = { transcriptStatus: "none", transcript: [], consoleIssues: [], failedRequests: [], frames: [], hasDiagnostics: false };

describe("completeness", () => {
  const full = {
    title: "T", steps: ["a", "b"], expected: "e", actual: "a", environment: "Chrome",
    frequency: "always", severity: "high",
    fieldSources: { actual: { actor: "agent" as const, at: "x", source: { kind: "console" as const, atMs: 100 } } },
  };
  it("is 100 when everything is present", () => {
    expect(computeCompleteness(full)).toEqual({ percent: 100, missing: [] });
  });
  it("requires 2 steps and evidence timestamp", () => {
    const r = computeCompleteness({ ...full, steps: ["only one", "  "], fieldSources: {} });
    expect(r.missing).toEqual(["steps", "evidence"]);
    expect(r.percent).toBe(75);
  });
  it("accepts evidence from diagnostics", () => {
    const evidence = { ...empty, consoleIssues: [{ id: "c", level: "error" as const, message: "x", atMs: 5 }] };
    expect(computeCompleteness({ ...full, fieldSources: {}, evidence }).missing).toEqual([]);
  });
  it("honours custom required fields", () => {
    expect(computeCompleteness({}, ["title"]).percent).toBe(0);
    expect(computeCompleteness({ title: "x" }, ["title"]).percent).toBe(100);
  });
});

describe("clips-url", () => {
  it("parses share links with token and whitespace", () => {
    const p = parseClipsUrl("  https://clips.example.com/share/abc123/?agent_access=tok  ");
    expect(p).toMatchObject({ recordingId: "abc123", origin: "https://clips.example.com", agentAccess: "tok" });
    expect(p.shareUrl).toBe("https://clips.example.com/share/abc123?agent_access=tok");
  });
  it("accepts embed and self-hosted hosts", () => {
    expect(parseClipsUrl("http://localhost:8080/embed/xyz789").shareUrl).toBe("http://localhost:8080/share/xyz789");
  });
  it.each(["not a link", "ftp://x.com/share/abc", "https://x.com/share/", "https://x.com/r/abc123", "https://x.com/"])("rejects %s", (u) => {
    expect(() => parseClipsUrl(u)).toThrow(ClipsUrlError);
  });
  it("says what is wrong", () => {
    expect(() => parseClipsUrl("https://x.com/foo/abc")).toThrow("That isn't a Clips share link");
  });
});

describe("error-signature", () => {
  it("normalizes the first console error", () => {
    const sig = computeErrorSignature({
      failedRequests: [],
      consoleIssues: [
        { id: "1", level: "warn", message: "warn first", atMs: 0 },
        { id: "2", level: "error", message: "TypeError: Cannot read 'id' of 0x1a2b3c at https://a.b/c.js:12:3  item 4821", atMs: 1 },
      ],
    });
    expect(sig).toBe("TypeError: Cannot read of at item");
  });
  it("falls back to warn, then failed request", () => {
    expect(computeErrorSignature({ failedRequests: [], consoleIssues: [{ id: "1", level: "warn", message: "careful 5", atMs: 0 }] })).toBe("careful");
    expect(
      computeErrorSignature({
        consoleIssues: [],
        failedRequests: [{ id: "n", method: "POST", url: "https://a.b/api/users/123/x?q=1", path: "/api/users/123/x", status: 500, atMs: 0 }],
      }),
    ).toBe("POST /api/users/:id/x 500");
  });
  it("is null with nothing", () => {
    expect(computeErrorSignature(empty)).toBeNull();
  });
  it("caps length", () => {
    const m = "word ".repeat(100);
    expect(computeErrorSignature({ failedRequests: [], consoleIssues: [{ id: "1", level: "error", message: m, atMs: 0 }] })!.length).toBeLessThanOrEqual(120);
  });
});

describe("clips-parse", () => {
  const ev = parseAgentContext(fx("agent-context.fixture.json"));
  it("maps diagnostics, keeping negative timestamps", () => {
    expect(ev.hasDiagnostics).toBe(true);
    expect(ev.consoleIssues.map((i) => i.atMs)).toEqual([-500, 4200]);
    expect(ev.failedRequests[0]).toMatchObject({ method: "POST", path: "/api/users/12345/settings", status: 500, atMs: 4100 });
    expect(ev.title).toBe("Save does nothing");
    expect(ev.durationMs).toBe(20000);
    expect(ev.pageUrl).toBe("https://app.example.test/settings");
    expect(ev.userAgent).toBe("FixtureBrowser/1.0");
    expect(ev.transcriptStatus).toBe("ready");
    expect(ev.transcript).toHaveLength(2);
  });
  it("handles missing diagnostics", () => {
    const e = parseAgentContext({ clip: { title: "x" }, browserDiagnostics: null, transcript: { status: "missing", segments: [] } });
    expect(e).toMatchObject({ hasDiagnostics: false, consoleIssues: [], failedRequests: [], transcriptStatus: "none" });
    expect(parseAgentContext(null).transcriptStatus).toBe("unavailable");
  });
  it("parses transcript nested and top-level", () => {
    expect(parseAgentTranscript(fx("agent-transcript.fixture.json")).segments).toHaveLength(1);
    expect(parseAgentTranscript({ segments: [{ startMs: 1, endMs: 2, text: "hi" }] }).segments).toHaveLength(1);
    expect(parseAgentTranscript({ transcript: { status: "streaming", segments: [] } }).status).toBe("pending");
  });
});

describe("frames", () => {
  it("picks error, request, keyword lines, deduped", () => {
    const ev = parseAgentContext(fx("agent-context.fixture.json"));
    const f = pickFrameTimestamps(ev);
    expect(f.map((x) => x.atMs)).toEqual([4200]); // request (4100) and transcript line (3000) fall within 1500ms of the error
    expect(f.length).toBeLessThanOrEqual(4);
  });
  it("uses midpoint otherwise and clamps", () => {
    expect(pickFrameTimestamps({ ...empty, durationMs: 10000 })).toEqual([{ atMs: 5000, label: "Midpoint of the clip" }]);
    expect(pickFrameTimestamps({ ...empty, consoleIssues: [{ id: "1", level: "error", message: "x", atMs: -400 }] })[0]!.atMs).toBe(0);
  });
});

describe("time", () => {
  it("formats", () => {
    expect(formatClipTime(0)).toBe("0:00");
    expect(formatClipTime(65_400)).toBe("1:05");
    expect(formatClipTime(3_725_000)).toBe("1:02:05");
    expect(formatClipTime(-5)).toBe("0:00");
  });
  it("links with at and keeps agent_access", () => {
    expect(clipLinkAt("https://c.io/share/abc?agent_access=t", 12_900)).toBe("https://c.io/share/abc?agent_access=t&at=12");
    expect(clipLinkAt("https://c.io/share/abc?at=1", 5000)).toBe("https://c.io/share/abc?at=5");
  });
});

describe("validateChanges (source rule)", () => {
  it("rejects agent changes without source", () => {
    const r = validateChanges([{ field: "title", value: "x" }], "agent");
    expect(r).toMatchObject({ ok: false, errorCode: "source_required" });
  });
  it("accepts agent change with source", () => {
    const r = validateChanges([{ field: "title", value: " Hi ", source: { kind: "transcript", atMs: 3000 } }], "agent");
    expect(r).toEqual({ ok: true, changes: [{ field: "title", value: "Hi", provenance: { actor: "agent", source: { kind: "transcript", atMs: 3000 } } }] });
  });
  it("human edits need no source and are tagged reporter", () => {
    const r = validateChanges([{ field: "severity", value: "high", source: { kind: "console" } }], "human");
    expect(r).toMatchObject({ ok: true, changes: [{ provenance: { actor: "human", source: { kind: "reporter" } } }] });
  });
  it("validates values", () => {
    expect(validateChanges([{ field: "severity", value: "huge" }], "human")).toMatchObject({ ok: false, errorCode: "invalid_value" });
    expect(validateChanges([{ field: "frequency", value: "" }], "human")).toMatchObject({ ok: true, changes: [{ value: null }] });
    expect(validateChanges([{ field: "steps", value: [" 1. open ", "", "- click"] }], "human")).toMatchObject({ ok: true, changes: [{ value: ["open", "click"] }] });
  });
});
