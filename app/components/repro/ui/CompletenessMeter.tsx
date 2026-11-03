import { cn } from "@/lib/utils";

export interface CompletenessMeterProps {
  /** 0 to 100. Values outside are clamped. */
  percent: number;
  /** Required fields still missing; shown in `md` as "· 2 missing". */
  missingCount?: number | undefined;
  /** `sm`: inbox/metrics cell. `md`: report top bar. */
  size?: "sm" | "md" | undefined;
  /** Hide the text and keep only the bar (very narrow layouts). */
  barOnly?: boolean | undefined;
  className?: string | undefined;
}

/**
 * Hairline completeness bar. Ink while filling, ready-green at 100%.
 * Never amber or red: missing fields are flagged on the fields themselves.
 */
export function CompletenessMeter({
  percent,
  missingCount,
  size = "sm",
  barOnly = false,
  className,
}: CompletenessMeterProps) {
  const value = Math.round(Math.min(100, Math.max(0, percent)));
  const complete = value >= 100;
  const missingText =
    missingCount && missingCount > 0
      ? `${missingCount} ${missingCount === 1 ? "field" : "fields"} missing`
      : undefined;

  return (
    <div
      role="progressbar"
      aria-label="Completeness"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={
        complete
          ? "Complete"
          : `${value}%${missingText ? `, ${missingText}` : ""}`
      }
      data-complete={complete ? "true" : "false"}
      className={cn(
        "inline-flex min-w-0 items-center",
        size === "sm" ? "gap-2" : "gap-2.5",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full bg-meter-track",
          size === "sm" ? "h-1 w-12" : "h-1.5 w-16",
        )}
      >
        <span
          className={cn(
            "repro-meter-fill absolute inset-y-0 start-0 rounded-full",
            complete ? "bg-meter-complete" : "bg-meter-fill",
          )}
          style={{
            width: value === 0 ? 0 : `max(${value}%, 2px)`,
          }}
        />
      </span>
      {barOnly ? null : size === "sm" ? (
        <span
          aria-hidden="true"
          className="w-8 shrink-0 text-end text-2xs tabular-nums text-muted-foreground"
        >
          {value}%
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="flex min-w-0 items-baseline gap-1.5 text-md tabular-nums"
        >
          {complete ? (
            <span className="font-medium text-ready-ink">Complete</span>
          ) : (
            <>
              <span className="font-medium text-foreground">{value}%</span>
              {missingCount && missingCount > 0 ? (
                <span className="truncate text-muted-foreground">
                  · {missingCount} missing
                </span>
              ) : null}
            </>
          )}
        </span>
      )}
    </div>
  );
}
