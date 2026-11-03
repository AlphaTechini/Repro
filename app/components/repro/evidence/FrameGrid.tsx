import { useT } from "@agent-native/core/client/i18n";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { FrameMarker } from "@shared/repro/types";

import { formatClipTime } from "../ui";
import { useClipFrame } from "./FramePreview";

function FrameTile({
  reportId,
  marker,
  selected,
  onSelect,
}: {
  reportId: string;
  marker: FrameMarker;
  selected: boolean;
  onSelect: () => void;
}) {
  const frame = useClipFrame(reportId, marker.atMs);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Frame at ${formatClipTime(marker.atMs)}${marker.label ? `: ${marker.label}` : ""}`}
      className={cn(
        "relative aspect-video overflow-hidden rounded-md border border-border bg-muted outline-none transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-ring",
        selected && "col-span-2 border-foreground/40",
      )}
    >
      {frame.data?.dataUrl ? (
        <img src={frame.data.dataUrl} alt="" className="size-full object-cover" />
      ) : frame.isError ? null : (
        <Skeleton className="size-full rounded-none" />
      )}
      <span className="absolute bottom-1 start-1 rounded-sm bg-black/70 px-1 font-mono text-2xs tabular-nums text-white">
        {formatClipTime(marker.atMs)}
      </span>
    </button>
  );
}

export function FrameGrid({
  reportId,
  frames,
  onSeek,
}: {
  reportId: string;
  frames: FrameMarker[];
  onSeek?: ((atMs: number) => void) | undefined;
}) {
  const t = useT();
  const [selected, setSelected] = useState<number | null>(null);
  if (frames.length === 0) {
    return (
      <p className="rounded-lg border border-border px-3 py-6 text-center text-md text-muted-foreground">
        {t("evidence.noFrames")}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {frames.map((m, i) => (
        <FrameTile
          key={`${m.atMs}-${i}`}
          reportId={reportId}
          marker={m}
          selected={selected === i}
          onSelect={() => {
            setSelected(selected === i ? null : i);
            onSeek?.(m.atMs);
          }}
        />
      ))}
    </div>
  );
}
