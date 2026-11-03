import { fail } from "@agent-native/core/action";

export interface ClipRef {
  recordingId: string;
  origin: string;
  agentAccess: string | null;
}

const TIMEOUT_MS = 15_000;

function endpoint(ref: ClipRef, path: string, extra: Record<string, string> = {}): string {
  const url = new URL(path, ref.origin);
  url.searchParams.set("id", ref.recordingId);
  if (ref.agentAccess) url.searchParams.set("agent_access", ref.agentAccess);
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  return url.toString();
}

async function get(url: string, accept: string): Promise<Response> {
  try {
    return await fetch(url, {
      headers: { accept },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return fail(
      timedOut
        ? "Clips did not respond within 15 seconds. Try again."
        : `Could not reach Clips (${err instanceof Error ? err.message : "network error"}). Check the link's host.`,
      { errorCode: "clips_unreachable", statusCode: 502 },
    );
  }
}

async function failFor(res: Response): Promise<never> {
  let detail = "";
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body.error === "string") detail = ` (${body.error})`;
  } catch {
    /* body is not JSON */
  }
  if (res.status === 401 || res.status === 403) {
    return fail("Clip is private: share it publicly or use a Share with agents link", {
      errorCode: "clip_private",
      statusCode: 403,
    });
  }
  if (res.status === 404) {
    return fail("Clip not found", { errorCode: "clip_not_found", statusCode: 404 });
  }
  if (res.status === 410) {
    return fail("This Clips share link has expired. Ask for a new one.", {
      errorCode: "clip_expired",
      statusCode: 410,
    });
  }
  return fail(`Clips returned HTTP ${res.status}${detail}.`, {
    errorCode: "clips_error",
    statusCode: 502,
  });
}

async function json(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return fail("Clips returned a response that is not JSON. Is this a Clips host?", {
      errorCode: "clips_bad_response",
      statusCode: 502,
    });
  }
}

export async function fetchAgentContext(ref: ClipRef): Promise<unknown> {
  const res = await get(endpoint(ref, "/api/agent-context.json"), "application/json");
  if (!res.ok) return failFor(res);
  return json(res);
}

/** Null when the transcript endpoint fails; the caller reports transcriptStatus "unavailable". */
export async function fetchAgentTranscript(ref: ClipRef): Promise<unknown | null> {
  try {
    const res = await get(endpoint(ref, "/api/agent-transcript.json"), "application/json");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchClipFrame(
  ref: ClipRef,
  atMs: number,
): Promise<{ bytes: Uint8Array; mediaType: string; resolvedAtMs: number }> {
  const res = await get(
    endpoint(ref, "/api/agent-frame.jpg", { atMs: String(Math.max(0, Math.round(atMs))) }),
    "image/jpeg,image/*",
  );
  if (!res.ok) return failFor(res);
  const mediaType = (res.headers.get("content-type") ?? "image/jpeg").split(";")[0]?.trim() ?? "image/jpeg";
  if (!mediaType.startsWith("image/")) {
    return fail("Clips did not return an image for that moment.", {
      errorCode: "clips_bad_response",
      statusCode: 502,
    });
  }
  let resolvedAtMs = Math.max(0, Math.round(atMs));
  try {
    const at = new URL(res.url).searchParams.get("atMs");
    if (at !== null && Number.isFinite(Number(at))) resolvedAtMs = Number(at);
  } catch {
    /* keep requested */
  }
  return { bytes: new Uint8Array(await res.arrayBuffer()), mediaType, resolvedAtMs };
}
