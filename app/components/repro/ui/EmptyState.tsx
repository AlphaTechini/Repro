import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode | undefined;
  /** Actions or inline content (a paste field, a link). */
  children?: ReactNode | undefined;
  /** `page`: first-run and route-level empties. `panel`: inside a list or tab. */
  size?: "page" | "panel" | undefined;
  className?: string | undefined;
}

/**
 * Left-aligned, text-first empty state. No illustrations, no icon tiles: the
 * copy says what is missing and the child offers the next action.
 */
export function EmptyState({
  title,
  description,
  children,
  size = "page",
  className,
}: EmptyStateProps) {
  if (size === "panel") {
    return (
      <div
        className={cn(
          "flex flex-col gap-1 px-3 py-8 text-center text-md",
          className,
        )}
      >
        <p className="font-medium text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-xs text-muted-foreground">
            {description}
          </p>
        ) : null}
        {children ? (
          <div className="mt-2 flex justify-center">{children}</div>
        ) : null}
      </div>
    );
  }
  return (
    <section
      className={cn(
        "mx-auto flex w-full max-w-lg flex-col gap-5 px-6 py-16 sm:py-24",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="text-md text-muted-foreground text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
