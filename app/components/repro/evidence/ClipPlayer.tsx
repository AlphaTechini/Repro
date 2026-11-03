import { useT } from "@agent-native/core/client/i18n";
import { IconArrowUpRight } from "@tabler/icons-react";
import { forwardRef, useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { FrameMarker } from "@shared/repro/types";

import { clipSeconds, formatClipTime } from "../ui";
import { ClipPlaceholder } from "./ClipPlaceholder";
import { FrameGrid } from "./FrameGrid";
import { shareUrlAt, type SeekTarget } from "./seek";

interface ClipPlayerProps {
  reportId: string;
  recordingId: string;
  origin: string;
  shareUrl: string;
  seek: SeekTarget;
  durationMs: number | null | undefined;
  frames: FrameMarker[];
  /** The clip has been read, so the embed is known to be reachable. */
  clipRead: boolean;
  /** A read is in flight or the agent is running: show the loading state. */
  reading?: boolean;
  readFailed?: boolean;
  onSeek: (atMs: number) => void;
}

const LOAD_TIMEOUT_MS = 6000;

/**
 * Clips embed with a frames fallback. The iframe is re-keyed on every seek
 * (debounced) because the embed only reads `?t=` on load.
 */
export const ClipPlayer = forwardRef<HTMLDivElement, ClipPlayerProps>(
  function ClipPlayer(
    { reportId, recordingId, origin, shareUrl, seek, durationMs, frames, clipRead, reading = false, readFailed = false, onSeek },
    ref,
  ) {
    const t = useT();
    const [applied, setApplied] = useState(seek);
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);
    const [showFrames, setShowFrames] = useState(false);

    useEffect(() => {
      const id = window.setTimeout(() => setApplied(seek), 150);
      return () => window.clearTimeout(id);
    }, [seek]);

    useEffect(() => {
      setLoaded(false);
    }, [applied.nonce, recordingId]);

    useEffect(() => {
      if (!clipRead || loaded || failed) return;
      const id = window.setTimeout(() => setFailed(true), LOAD_TIMEOUT_MS);
      return () => window.clearTimeout(id);
    }, [clipRead, loaded, failed, applied.nonce]);

    const framesMode = showFrames || failed;
    const src = `${origin}/embed/${encodeURIComponent(recordingId)}?t=${clipSeconds(applied.atMs)}`;

    return (
      <div ref={ref} className="flex flex-col gap-2">
        {!clipRead ? (
          <ClipPlaceholder
            state={readFailed ? "unavailable" : reading ? "loading" : "idle"}
            shareUrl={shareUrl}
          />
        ) : framesMode && frames.length > 0 ? (
          <FrameGrid reportId={reportId} frames={frames} onSeek={onSeek} />
        ) : failed ? (
          <ClipPlaceholder state="unavailable" shareUrl={shareUrl} />
        ) : (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted/40">
            <iframe
              key={applied.nonce}
              src={src}
              title={t("evidence.playerTitle")}
              allow="autoplay; fullscreen; picture-in-picture"
              onLoad={() => setLoaded(true)}
              className={cn(
                "absolute inset-0 size-full opacity-0 transition-opacity duration-200",
                loaded && "opacity-100",
              )}
            />
          </div>
        )}
        {clipRead && !(failed && frames.length === 0) ? (
        <div className="flex items-center justify-between gap-3 text-2xs text-muted-foreground">
          <span className="font-mono tabular-nums">
            {durationMs != null ? formatClipTime(durationMs) : null}
          </span>
          <span className="flex items-center gap-3">
            {frames.length > 0 && !failed ? (
              <Button
                variant="link"
                size="xs"
                className="h-auto p-0 text-2xs text-muted-foreground"
                onClick={() => setShowFrames((v) => !v)}
              >
                {showFrames ? t("evidence.showPlayer") : t("evidence.showFrames")}
              </Button>
            ) : null}
            <a
              href={shareUrlAt(shareUrl, seek.atMs)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 hover:text-foreground"
            >
              {t("evidence.openInClips")}
              <IconArrowUpRight aria-hidden="true" className="size-3" />
            </a>
          </span>
        </div>
        ) : null}
      </div>
    );
  },
);
