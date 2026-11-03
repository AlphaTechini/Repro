import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/** ids FieldShell renders, so the control can point at them. */
export function fieldIds(id: string) {
  return { hint: `${id}-hint`, error: `${id}-error` };
}

/**
 * Props to spread on the control inside a FieldShell:
 * `<Input id={id} {...fieldA11y(id, { error, hint: !!hint })} />`.
 */
export function fieldA11y(
  id: string,
  opts: { error?: string | null | undefined; hint?: boolean | undefined } = {},
) {
  const ids = fieldIds(id);
  const describedBy = opts.error ? ids.error : opts.hint ? ids.hint : undefined;
  return {
    "aria-invalid": opts.error ? (true as const) : undefined,
    "aria-describedby": describedBy,
  };
}

export interface MissingMarkProps {
  /** Default "Needed". Use specifics like "Needs 2+ steps". */
  label?: string | undefined;
  className?: string | undefined;
}

/** Calm flag for an empty required field: amber dot + short ink label. */
export function MissingMark({ label = "Needed", className }: MissingMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1.5 text-2xs font-medium text-needs-info-ink",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-status-needs-info"
      />
      {label}
    </span>
  );
}

export interface FieldShellProps {
  /** The control's id; the label points at it. */
  id: string;
  label: ReactNode;
  /** <ProvenanceMark/> for filled fields. Ignored while `missing`. */
  provenance?: ReactNode | undefined;
  /** true or a specific label ("Needs 2+ steps") when a required field is empty. */
  missing?: boolean | string | undefined;
  error?: string | null | undefined;
  hint?: ReactNode | undefined;
  /**
   * `stacked`: label row above the control (long text, steps).
   * `inline`: 7rem label column, control, marks (properties).
   */
  layout?: "stacked" | "inline" | undefined;
  /**
   * Changes each time the AGENT writes this field (e.g. the event id or
   * `updatedAt` of the latest agent `field_set`). A change after first mount
   * plays the agent-fill highlight once. Pass undefined until data loads and
   * for human edits, so loading and typing never flash.
   */
  flashKey?: string | number | null | undefined;
  /** Extra control at the end of the label row (e.g. "Add step"). */
  labelAction?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
}

function useFlash(flashKey: FieldShellProps["flashKey"]) {
  const previous = useRef(flashKey);
  const [flashId, setFlashId] = useState(0);
  useEffect(() => {
    const before = previous.current;
    previous.current = flashKey;
    if (flashKey == null || before === undefined) return;
    if (before !== flashKey) setFlashId((n) => n + 1);
  }, [flashKey]);
  return [flashId, () => setFlashId(0)] as const;
}

export function FieldShell({
  id,
  label,
  provenance,
  missing,
  error,
  hint,
  layout = "stacked",
  flashKey,
  labelAction,
  children,
  className,
}: FieldShellProps) {
  const [flashId, clearFlash] = useFlash(flashKey);
  const ids = fieldIds(id);
  const isMissing = missing != null && missing !== false;
  const marks = (
    <>
      {isMissing ? (
        <MissingMark
          label={typeof missing === "string" ? missing : undefined}
        />
      ) : (
        provenance
      )}
      {labelAction}
    </>
  );
  const message = error ? (
    <p id={ids.error} className="text-xs text-error-ink">
      {error}
    </p>
  ) : hint ? (
    <p id={ids.hint} className="text-xs text-muted-foreground">
      {hint}
    </p>
  ) : null;
  const flash =
    flashId > 0 ? (
      <span
        key={flashId}
        aria-hidden="true"
        onAnimationEnd={clearFlash}
        className="repro-agent-flash pointer-events-none absolute -inset-x-2 -inset-y-1 rounded-md"
      />
    ) : null;

  if (layout === "inline") {
    // Below @lg (form column < 32rem) the marks sit under the label instead
    // of in a third column, so they never add an empty row under the
    // control. Empty mark wrappers collapse (`empty:hidden`).
    return (
      <div
        data-field={id}
        data-missing={isMissing ? "true" : undefined}
        className={cn(
          "group/field relative grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-1 @lg:grid-cols-[7rem_minmax(0,1fr)_auto]",
          className,
        )}
      >
        <div className="flex min-h-9 min-w-0 flex-col justify-center gap-0.5">
          <label
            htmlFor={id}
            className="truncate text-xs font-medium text-muted-foreground"
          >
            {label}
          </label>
          <div className="flex min-w-0 items-center gap-1.5 empty:hidden @lg:hidden">
            {marks}
          </div>
        </div>
        <div className="flex min-h-9 min-w-0 items-center">{children}</div>
        <div className="hidden min-h-9 items-center justify-end gap-1.5 @lg:flex @lg:empty:hidden">
          {marks}
        </div>
        {message ? (
          <div className="col-start-2 @lg:col-span-2">{message}</div>
        ) : null}
        {flash}
      </div>
    );
  }

  return (
    <div
      data-field={id}
      data-missing={isMissing ? "true" : undefined}
      className={cn("group/field relative flex flex-col gap-1.5", className)}
    >
      <div className="flex min-h-5 items-center justify-between gap-3">
        <label
          htmlFor={id}
          className="truncate text-xs font-medium text-muted-foreground"
        >
          {label}
        </label>
        <div className="flex shrink-0 items-center gap-1.5 empty:hidden">
          {marks}
        </div>
      </div>
      {children}
      {message}
      {flash}
    </div>
  );
}
