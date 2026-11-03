/**
 * Class recipes shared across Repro screens. Always merge with `cn()` so
 * tailwind-merge can resolve them against a primitive's own classes.
 * See docs/UI-DESIGN.md §5.
 */

/** Document-style input/textarea: no chrome until hover or focus. */
export const quietInput =
  "border-transparent bg-transparent shadow-none px-2 -mx-2 hover:border-border focus-visible:border-ring/60 focus-visible:bg-background focus-visible:ring-0 focus-visible:ring-offset-0";

/**
 * A required field that is still empty. Apply after `quietInput`.
 * Neutral dashed slot at rest (eight amber boxes at once read as an alarm);
 * the amber "Needed" mark in the label row carries the signal, and the
 * outline warms to amber only on hover/focus.
 */
export const missingOutline =
  "border-dashed border-input hover:border-status-needs-info/70 focus-visible:border-status-needs-info";

/** Small mono metadata: timestamps, error signatures, issue numbers. */
export const monoMeta = "font-mono text-2xs tabular-nums text-muted-foreground";

/** Table/list header cell. */
export const headCell =
  "h-8 px-3 text-left align-middle text-2xs font-medium text-muted-foreground";

/** Table/list body cell. */
export const bodyCell = "px-3 align-middle text-md text-foreground";

/** Section label inside a page (not a page title). */
export const sectionLabel = "text-xs font-medium text-muted-foreground";

/** Hairline-separated panel (the only "card" Repro uses). */
export const panel = "rounded-lg border border-border bg-background";
