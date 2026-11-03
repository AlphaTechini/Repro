import type { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { formatClipTime } from "./format";
import {
  SOURCE_KIND_LABEL,
  type FieldProvenance,
  type FieldSource,
} from "./types";

export interface SourceChipProps {
  source: FieldSource;
  /**
   * Seek the evidence player. When set and the source has `atMs`, the chip is
   * a button; otherwise it is static text.
   */
  onSeek?: ((atMs: number) => void) | undefined;
  /** Tooltip body: the quoted transcript line, console message, request. */
  preview?: ReactNode | undefined;
  /** Play the pop-in once (pass true for the render right after an agent write). */
  fresh?: boolean | undefined;
  className?: string | undefined;
}

const chipBase =
  "inline-flex h-5 max-w-full shrink-0 items-center gap-1 rounded-sm px-1.5 text-2xs leading-none whitespace-nowrap";

/**
 * Provenance for an agent-filled value: "0:07 · transcript". The one place
 * Repro's agent accent appears at rest.
 */
export function SourceChip({
  source,
  onSeek,
  preview,
  fresh = false,
  className,
}: SourceChipProps) {
  const time = source.atMs != null ? formatClipTime(source.atMs) : null;
  const kind = SOURCE_KIND_LABEL[source.kind];
  const seekable = onSeek != null && source.atMs != null;
  const accessibleName = time
    ? `Filled by the agent from the ${kind} at ${time}${seekable ? ". Play from here" : ""}`
    : `Filled by the agent from the ${kind}`;

  const content = (
    <>
      {time ? <span className="font-mono tabular-nums">{time}</span> : null}
      {time ? (
        <span aria-hidden="true" className="opacity-50">
          ·
        </span>
      ) : null}
      <span>{kind}</span>
    </>
  );

  const classes = cn(
    chipBase,
    "bg-source-agent/8 text-source-agent-ink",
    seekable &&
      "cursor-pointer transition-colors duration-150 hover:bg-source-agent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    fresh && "animate-repro-chip-in",
    className,
  );

  const chip = seekable ? (
    <button
      type="button"
      aria-label={accessibleName}
      className={classes}
      onClick={() => onSeek(source.atMs as number)}
    >
      {content}
    </button>
  ) : (
    <span aria-label={accessibleName} role="note" className={classes}>
      {content}
    </span>
  );

  const tip = preview ?? (seekable ? `Play from ${time}` : null);
  if (!tip) return chip;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent side="top" align="end" className="max-w-xs">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

export interface HumanMarkProps {
  /** Omit for the signed-in user ("You"). */
  name?: string | undefined;
  className?: string | undefined;
}

/** Provenance for a human-entered value. Deliberately ink, not accent. */
export function HumanMark({ name, className }: HumanMarkProps) {
  const label = name ?? "You";
  return (
    <span
      role="note"
      aria-label={name ? `Edited by ${name}` : "Edited by you"}
      className={cn(chipBase, "px-1 text-muted-foreground", className)}
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-source-human/60"
      />
      {label}
    </span>
  );
}

export interface ProvenanceMarkProps {
  provenance: FieldProvenance | null | undefined;
  onSeek?: ((atMs: number) => void) | undefined;
  preview?: ReactNode | undefined;
  fresh?: boolean | undefined;
  /** Display name when the human editor is not the viewer. */
  humanName?: string | undefined;
  /**
   * Show "You" for the viewer's own edits. Off by default: the absence of an
   * agent chip already means a person wrote it, and "You" on every field is
   * noise. Turn on where it carries information (e.g. the viewer overrode an
   * agent value).
   */
  showSelf?: boolean | undefined;
  className?: string | undefined;
}

/** Picks SourceChip (agent) or HumanMark (human) for a field's label row. */
export function ProvenanceMark({
  provenance,
  onSeek,
  preview,
  fresh,
  humanName,
  showSelf = false,
  className,
}: ProvenanceMarkProps) {
  if (!provenance) return null;
  if (provenance.actor === "agent" && provenance.source) {
    return (
      <SourceChip
        source={provenance.source}
        onSeek={onSeek}
        preview={preview}
        fresh={fresh}
        className={className}
      />
    );
  }
  if (!humanName && !showSelf) return null;
  return <HumanMark name={humanName} className={className} />;
}
