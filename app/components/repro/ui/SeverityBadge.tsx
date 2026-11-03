import { IconAlertSquareFilled } from "@tabler/icons-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { SEVERITY_LABEL, type Severity } from "./types";

const BARS: Record<Exclude<Severity, "critical">, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const SEVERITY_COLOR: Record<Severity, string> = {
  low: "text-sev-low",
  medium: "text-sev-medium",
  high: "text-sev-high",
  critical: "text-sev-critical",
};

/** Three rising bars, filled by level; critical is a solid alert square. */
export function SeverityGlyph({
  severity,
  className,
}: {
  severity: Severity | null | undefined;
  className?: string | undefined;
}) {
  if (severity === "critical") {
    return (
      <IconAlertSquareFilled
        aria-hidden="true"
        className={cn("size-3.5 shrink-0", SEVERITY_COLOR.critical, className)}
      />
    );
  }
  const filled = severity ? BARS[severity] : 0;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 14 14"
      className={cn(
        "size-3.5 shrink-0",
        severity ? SEVERITY_COLOR[severity] : "text-muted-foreground",
        className,
      )}
    >
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={1.5 + i * 4.25}
          y={9 - i * 3}
          width={2.5}
          height={3.5 + i * 3}
          rx={0.75}
          fill="currentColor"
          opacity={i < filled ? 1 : 0.22}
        />
      ))}
    </svg>
  );
}

export interface SeverityBadgeProps {
  severity: Severity | null | undefined;
  /** `plain`: glyph + label. `icon`: glyph only with tooltip. */
  variant?: "plain" | "icon" | undefined;
  className?: string | undefined;
}

export function SeverityBadge({
  severity,
  variant = "plain",
  className,
}: SeverityBadgeProps) {
  const label = severity ? SEVERITY_LABEL[severity] : "No severity";

  if (variant === "icon" && severity) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="img"
            aria-label={`Severity: ${label}`}
            className={cn(
              "inline-flex size-5 items-center justify-center",
              className,
            )}
          >
            <SeverityGlyph severity={severity} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    );
  }

  if (!severity) {
    return (
      <span
        data-severity="none"
        className={cn(
          "inline-flex min-w-0 items-center text-md text-muted-foreground",
          className,
        )}
      >
        <span aria-hidden="true" className="w-3.5 text-center">
          —
        </span>
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <span
      data-severity={severity}
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 text-md text-foreground",
        severity === "critical" && "font-medium",
        className,
      )}
    >
      <SeverityGlyph severity={severity} />
      <span className="truncate">{label}</span>
    </span>
  );
}
