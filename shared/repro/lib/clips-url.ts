export interface ParsedClipsUrl {
  recordingId: string;
  /** scheme + host (+ port) */
  origin: string;
  agentAccess: string | null;
  /** Canonical share URL, including agent_access when present. */
  shareUrl: string;
}

export class ClipsUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClipsUrlError";
  }
}

const NOT_CLIPS = "That isn't a Clips share link";
const ID_RE = /^[A-Za-z0-9_-]{3,128}$/;

/** Accepts https://<host>/share/<id> or /embed/<id>; any host (self-hosted Clips). Throws ClipsUrlError. */
export function parseClipsUrl(input: string): ParsedClipsUrl {
  const raw = (input ?? "").trim();
  if (!raw) throw new ClipsUrlError("Paste a Clips share link.");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ClipsUrlError(`${NOT_CLIPS}. Paste the full https:// link.`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ClipsUrlError(`${NOT_CLIPS}. Only http(s) links are supported.`);
  }
  const parts = url.pathname.split("/").filter((p) => p.length > 0);
  const kind = parts[0]?.toLowerCase();
  if (parts.length < 1 || (kind !== "share" && kind !== "embed")) {
    throw new ClipsUrlError(`${NOT_CLIPS} (expected …/share/<id>).`);
  }
  const id = parts[1];
  if (!id) throw new ClipsUrlError(`${NOT_CLIPS}: the link has no recording id.`);
  if (parts.length > 2 || !ID_RE.test(id)) {
    throw new ClipsUrlError(`${NOT_CLIPS} (expected …/share/<id>).`);
  }
  const token = url.searchParams.get("agent_access");
  const agentAccess = token && token.trim() ? token.trim() : null;
  const origin = url.origin;
  const shareUrl =
    `${origin}/share/${id}` +
    (agentAccess ? `?agent_access=${encodeURIComponent(agentAccess)}` : "");
  return { recordingId: id, origin, agentAccess, shareUrl };
}
