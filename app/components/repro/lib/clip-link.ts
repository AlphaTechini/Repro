/**
 * Instant client-side shape check for a Clips share link. The server
 * (create-report) is the authority; this only gives feedback while typing.
 */
export type ClipLinkParse =
  | { ok: true; id: string; host: string; url: string }
  | { ok: false };

const SHARE_PATH = /^\/share\/([A-Za-z0-9_-]+)\/?$/;

export function parseClipLink(input: string): ClipLinkParse {
  const raw = input.trim();
  if (!raw) return { ok: false };
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false };
  }
  if (!url.hostname.includes(".")) return { ok: false };
  const match = SHARE_PATH.exec(url.pathname);
  const id = match?.[1];
  if (!id) return { ok: false };
  return { ok: true, id, host: url.host, url: withScheme };
}
