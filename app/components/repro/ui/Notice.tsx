import {
  IconAlertCircle,
  IconAlertTriangle,
  IconInfoCircle,
  IconMessageCircle,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type NoticeTone = "neutral" | "warning" | "danger" | "agent";

const TONE: Record<
  NoticeTone,
  { box: string; icon: string; Glyph: typeof IconInfoCircle }
> = {
  neutral: {
    box: "border-border bg-muted/40",
    icon: "text-muted-foreground",
    Glyph: IconInfoCircle,
  },
  warning: {
    box: "border-status-needs-info/35 bg-status-needs-info/8",
    icon: "text-status-needs-info",
    Glyph: IconAlertTriangle,
  },
  danger: {
    box: "border-level-error/30 bg-level-error/6",
    icon: "text-level-error",
    Glyph: IconAlertCircle,
  },
  agent: {
    box: "border-source-agent/25 bg-source-agent/6",
    icon: "text-source-agent",
    Glyph: IconMessageCircle,
  },
};

export interface NoticeProps {
  tone?: NoticeTone | undefined;
  title?: ReactNode | undefined;
  children?: ReactNode | undefined;
  /** Buttons (size="xs" or "sm"), right-aligned on wide, wrapped on narrow. */
  actions?: ReactNode | undefined;
  className?: string | undefined;
}

/**
 * Inline banner for page- or section-level state: clip read failed,
 * possible duplicate, GitHub not connected. Not for field validation.
 */
export function Notice({
  tone = "neutral",
  title,
  children,
  actions,
  className,
}: NoticeProps) {
  const { box, icon, Glyph } = TONE[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex flex-wrap items-start gap-x-2.5 gap-y-2 rounded-lg border px-3 py-2.5 text-md",
        box,
        className,
      )}
    >
      <Glyph
        aria-hidden="true"
        className={cn("mt-0.5 size-4 shrink-0", icon)}
        strokeWidth={1.8}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {title ? <p className="font-medium text-foreground">{title}</p> : null}
        {children ? (
          <div className="text-muted-foreground">{children}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-1.5 max-sm:w-full max-sm:ps-6.5">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
