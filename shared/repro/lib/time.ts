/** "m:ss", or "h:mm:ss" from one hour up. Negative offsets clamp to 0. */
export function formatClipTime(ms: number): string {
  const total = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

/** Share URL with `at=<seconds>`; keeps agent_access and other params. */
export function clipLinkAt(shareUrl: string, ms: number): string {
  const seconds = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  try {
    const url = new URL(shareUrl);
    url.searchParams.set("at", String(seconds));
    return url.toString();
  } catch {
    const sep = shareUrl.includes("?") ? "&" : "?";
    return `${shareUrl}${sep}at=${seconds}`;
  }
}
