import {
  IconCircleCheck,
  IconCircleCheckFilled,
  IconCircleDashed,
  IconCopy,
  IconProgressHelp,
  type Icon,
} from "@tabler/icons-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { STATUS_LABEL, type ReportStatus } from "./types";

const STATUS_ICON: Record<ReportStatus, Icon> = {
  draft: IconCircleDashed,
  "needs-info": IconProgressHelp,
  ready: IconCircleCheck,
  filed: IconCircleCheckFilled,
  duplicate: IconCopy,
};

const STATUS_COLOR: Record<ReportStatus, string> = {
  draft: "text-status-draft",
  "needs-info": "text-status-needs-info",
  ready: "text-status-ready",
  filed: "text-status-filed",
  duplicate: "text-status-duplicate",
};

export function StatusGlyph({
  status,
  className,
}: {
  status: ReportStatus;
  className?: string | undefined;
}) {
  const Glyph = STATUS_ICON[status];
  return (
    <Glyph
      aria-hidden="true"
      strokeWidth={2}
      className={cn("size-3.5 shrink-0", STATUS_COLOR[status], className)}
    />
  );
}

export interface StatusPillProps {
  status: ReportStatus;
  /**
   * `pill`: outlined neutral pill (report top bar).
   * `plain`: glyph + muted label (inbox status column).
   * `icon`: glyph only, with tooltip and accessible name (tight columns).
   */
  variant?: "pill" | "plain" | "icon" | undefined;
  className?: string | undefined;
}

export function StatusPill({
  status,
  variant = "pill",
  className,
}: StatusPillProps) {
  const label = STATUS_LABEL[status];

  if (variant === "icon") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="img"
            aria-label={`Status: ${label}`}
            className={cn(
              "inline-flex size-5 items-center justify-center",
              className,
            )}
          >
            <StatusGlyph status={status} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    );
  }

  if (variant === "plain") {
    return (
      <span
        data-status={status}
        className={cn(
          "inline-flex min-w-0 items-center gap-1.5 text-md text-muted-foreground",
          className,
        )}
      >
        <StatusGlyph status={status} />
        <span className="truncate">{label}</span>
      </span>
    );
  }

  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-border bg-background ps-1.5 pe-2.5 text-xs font-medium text-foreground",
        className,
      )}
    >
      <StatusGlyph status={status} />
      {label}
    </span>
  );
}
