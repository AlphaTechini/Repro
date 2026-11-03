import { useT } from "@agent-native/core/client/i18n";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { useDraft, useHeldFlashKey } from "../lib/use-draft";
import { FieldShell, fieldA11y, missingOutline, quietInput } from "../ui";

interface Props {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
  provenance?: ReactNode;
  missing?: boolean | undefined;
  /** Agent can fill this and the clip is still being read. */
  pending?: boolean | undefined;
  readOnly?: boolean | undefined;
  flashKey?: string | number | null | undefined;
  layout?: "stacked" | "inline" | undefined;
  /** Single line control (Input) instead of an auto-grow textarea. */
  single?: boolean | undefined;
  variant?: "title" | "body" | undefined;
}

// `field-sizing: content` hugs the text natively. The JS autosize is only a
// fallback for engines without it.
const NATIVE_FIELD_SIZING = typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");

function autosize(el: HTMLTextAreaElement | null) {
  if (!el || NATIVE_FIELD_SIZING) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

export function ReportTextField({
  id,
  label,
  value,
  placeholder,
  onSave,
  provenance,
  missing,
  pending,
  readOnly,
  flashKey,
  layout = "stacked",
  single,
  variant = "body",
}: Props) {
  const t = useT();
  const d = useDraft<string>(value);
  const held = useHeldFlashKey(flashKey, d.hasConflict);
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => autosize(ref.current), [d.draft, variant]);
  useEffect(() => {
    const onResize = () => autosize(ref.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function commit() {
    if (!d.dirty) return;
    const next = d.draft.trim() === d.draft ? d.draft : d.draft.trim();
    d.setDraft(next);
    d.commit();
    onSave(next);
  }

  const hint = d.hasConflict ? (
    <>
      {t("report.agentUpdated")}{" "}
      <Button variant="link" size="xs" className="h-auto p-0" onClick={d.useRemote}>
        {t("report.useAgentVersion")}
      </Button>
    </>
  ) : undefined;

  const common = {
    id,
    value: d.draft,
    placeholder,
    readOnly,
    onChange: (e: { target: { value: string } }) => d.setDraft(e.target.value),
    onBlur: commit,
    ...fieldA11y(id, { hint: !!hint }),
  };

  const control = pending && !d.draft ? (
    <div className="py-1.5">
      <Skeleton className={cn("h-4 w-2/3", variant === "title" && "h-6 w-1/2")} />
    </div>
  ) : single ? (
    <Input
      {...common}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLElement).blur();
      }}
      className={cn(
        quietInput,
        "mx-0 h-8 text-sm",
        missing && missingOutline,
        readOnly && "hover:border-transparent",
      )}
    />
  ) : (
    <Textarea
      {...common}
      ref={ref}
      rows={1}
      onKeyDown={(e) => {
        if (variant === "title" && e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          (e.target as HTMLElement).blur();
        }
      }}
      className={cn(
        quietInput,
        "field-sizing-content resize-none overflow-hidden",
        variant === "title"
          ? "min-h-0 py-1 text-xl font-semibold leading-7 tracking-tight"
          : "min-h-9 py-1.5 text-sm leading-6 focus:min-h-[4.5rem]",
        missing && missingOutline,
        readOnly && "hover:border-transparent",
      )}
    />
  );

  return (
    <FieldShell
      id={id}
      label={label}
      layout={layout}
      provenance={provenance}
      missing={missing}
      hint={hint}
      flashKey={held}
      className={undefined}
    >
      {pending && !d.draft ? <div aria-busy="true">{control}</div> : control}
    </FieldShell>
  );
}
