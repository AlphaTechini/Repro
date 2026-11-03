import { IconCheck, IconPointFilled } from "@tabler/icons-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface KpiTarget {
  /** "≤ 3", "100%". */
  label: string;
  /** true = on target, false = off target, null = not enough data. */
  met: boolean | null;
}

export interface KpiTileProps {
  label: string;
  /** Pre-formatted headline number: "4m 12s", "1.7", "78%". */
  value: ReactNode;
  /** Small unit after the value: "per report". */
  unit?: string | undefined;
  target?: KpiTarget | undefined;
  /** One short line under the value: "across 12 filed reports". */
  footnote?: ReactNode | undefined;
  /** Optional inline viz (split bar, pips). Keep under 24px tall. */
  children?: ReactNode | undefined;
  loading?: boolean | undefined;
  className?: string | undefined;
}

/** One cell of a KpiStrip. No border of its own: the strip draws hairlines. */
export function KpiTile({
  label,
  value,
  unit,
  target,
  footnote,
  children,
  loading = false,
  className,
}: KpiTileProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 bg-background px-4 py-3.5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-muted-foreground">
          {label}
        </span>
        {target && !loading ? <KpiTargetMark target={target} /> : null}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-20" />
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold leading-7 tracking-tight tabular-nums text-foreground">
            {value}
          </span>
          {unit ? (
            <span className="text-md text-muted-foreground">{unit}</span>
          ) : null}
        </div>
      )}
      {children && !loading ? <div className="min-h-0">{children}</div> : null}
      {footnote && !loading ? (
        <span className="truncate text-2xs text-muted-foreground">
          {footnote}
        </span>
      ) : null}
    </div>
  );
}

function KpiTargetMark({ target }: { target: KpiTarget }) {
  if (target.met === true) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-2xs text-ready-ink">
        <IconCheck aria-hidden="true" className="size-3" strokeWidth={2.5} />
        Target {target.label}
      </span>
    );
  }
  if (target.met === false) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-2xs text-needs-info-ink">
        <IconPointFilled aria-hidden="true" className="size-3" />
        Target {target.label}
      </span>
    );
  }
  return (
    <span className="shrink-0 text-2xs text-muted-foreground">
      Target {target.label}
    </span>
  );
}

/**
 * Hairline grid for KPI tiles: 1 column, 2 at @xl, 4 at @4xl container
 * width. Put `@container` on an ancestor (the page wrapper).
 */
export function KpiStrip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border @xl:grid-cols-2 @4xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Two-part bar for agent vs human share. `agent` and `human` are counts. */
export function SplitBar({
  agent,
  human,
  className,
}: {
  agent: number;
  human: number;
  className?: string | undefined;
}) {
  return (
    <div
      role="img"
      aria-label={`${agent} agent-filled, ${human} human-edited`}
      className={cn(
        "flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-meter-track",
        className,
      )}
    >
      {agent > 0 ? (
        <span
          className="h-full min-w-0 bg-source-agent"
          style={{ flexGrow: agent }}
        />
      ) : null}
      {human > 0 ? (
        <span
          className="h-full min-w-0 bg-source-human/70"
          style={{ flexGrow: human }}
        />
      ) : null}
    </div>
  );
}

/** Follow-up questions as pips against the cap (default 3). */
export function QuestionPips({
  count,
  cap = 3,
  className,
}: {
  count: number;
  cap?: number | undefined;
  className?: string | undefined;
}) {
  const over = count > cap;
  return (
    <span
      role="img"
      aria-label={`${count} of ${cap} follow-up questions`}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {Array.from({ length: Math.max(cap, count) }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2.5 w-1 rounded-full",
            i < count
              ? over && i >= cap
                ? "bg-status-needs-info"
                : "bg-meter-fill"
              : "bg-meter-track",
          )}
        />
      ))}
    </span>
  );
}
