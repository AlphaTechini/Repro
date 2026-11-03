import { cn } from "@/lib/utils";

import { formatClipTime } from "../ui";

export interface TimelineTick {
  atMs: number;
  kind: "error" | "warn" | "cited";
  label: string;
}

const TICK: Record<TimelineTick["kind"], string> = {
  error: "bg-level-error",
  warn: "bg-level-warn",
  cited: "bg-source-agent",
};

/** Hairline track with a tick per notable moment. */
export function EvidenceTimeline({
  durationMs,
  ticks,
  onSeek,
}: {
  durationMs: number;
  ticks: TimelineTick[];
  onSeek: (atMs: number) => void;
}) {
  if (durationMs <= 0 || ticks.length === 0) return null;
  return (
    <div className="relative h-5" role="group" aria-label="Moments in the recording">
      <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-border" />
      {ticks.map((tick, i) => {
        const pct = Math.min(100, Math.max(0, (tick.atMs / durationMs) * 100));
        return (
          <button
            key={`${tick.atMs}-${tick.kind}-${i}`}
            type="button"
            aria-label={`${tick.label} at ${formatClipTime(tick.atMs)}`}
            title={`${tick.label} · ${formatClipTime(tick.atMs)}`}
            onClick={() => onSeek(tick.atMs)}
            style={{ insetInlineStart: `${pct}%` }}
            className={cn(
              "absolute top-1 h-3 w-0.5 rounded-full outline-none before:absolute before:-inset-x-1.5 before:-inset-y-1 focus-visible:ring-2 focus-visible:ring-ring",
              TICK[tick.kind],
            )}
          />
        );
      })}
    </div>
  );
}
