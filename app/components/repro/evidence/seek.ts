import { clipSeconds } from "../ui";

export interface SeekTarget {
  atMs: number;
  /** Bumps on every seek, even to the same time, so the player re-keys. */
  nonce: number;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Share URL at a moment, for "Open in Clips". */
export function shareUrlAt(shareUrl: string, atMs: number): string {
  try {
    const url = new URL(shareUrl);
    url.searchParams.set("at", String(clipSeconds(atMs)));
    return url.toString();
  } catch {
    return shareUrl;
  }
}
