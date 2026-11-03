import { useT } from "@agent-native/core/client/i18n";

import { cn } from "@/lib/utils";
import type { TranscriptSegment, TranscriptStatus } from "@shared/repro/types";

import { EmptyState, formatClipTime } from "../ui";

export function TranscriptList({
  segments,
  status,
  citedIndexes,
  activeIndex,
  onSeek,
}: {
  segments: TranscriptSegment[];
  status: TranscriptStatus;
  citedIndexes: ReadonlySet<number>;
  activeIndex: number | null;
  onSeek: (atMs: number) => void;
}) {
  const t = useT();
  if (segments.length === 0) {
    if (status === "pending") {
      return (
        <EmptyState
          size="panel"
          title={t("evidence.transcriptPending")}
          description={t("evidence.transcriptPendingBody")}
        />
      );
    }
    return (
      <EmptyState
        size="panel"
        title={t("evidence.transcriptNone")}
        description={t("evidence.transcriptNoneBody")}
      />
    );
  }
  return (
    <ol className="flex flex-col gap-0.5">
      {segments.map((seg, i) => (
        <li key={`${seg.startMs}-${i}`}>
          <button
            type="button"
            onClick={() => onSeek(seg.startMs)}
            aria-label={`Play from ${formatClipTime(seg.startMs)}: ${seg.text}`}
            className={cn(
              "grid w-full grid-cols-[2.5rem_minmax(0,1fr)] gap-x-2 rounded-md px-1.5 py-1 text-start outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring",
              activeIndex === i && "bg-accent/60",
            )}
          >
            <span className="pt-px font-mono text-2xs tabular-nums text-muted-foreground">
              {formatClipTime(seg.startMs)}
            </span>
            <span
              className={cn(
                "text-md leading-5 text-foreground",
                citedIndexes.has(i) && "border-s-2 border-source-agent/60 ps-2",
              )}
            >
              {seg.text}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
