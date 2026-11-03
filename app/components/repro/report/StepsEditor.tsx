import { useT } from "@agent-native/core/client/i18n";
import { IconGripVertical, IconPlus, IconX } from "@tabler/icons-react";
import { useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { sameValue } from "../lib/fields";
import { useDraft } from "../lib/use-draft";
import { FieldShell, quietInput, missingOutline } from "../ui";

const clean = (steps: string[]) => steps.map((s) => s.trim()).filter(Boolean);
const eqSteps = (a: string[], b: string[]) => sameValue(clean(a), clean(b));

export function StepsEditor({
  steps,
  onSave,
  provenance,
  missing,
  readOnly,
  loading,
  flashKey,
}: {
  steps: string[];
  onSave: (steps: string[]) => void;
  provenance?: ReactNode;
  missing?: string | false | undefined;
  readOnly?: boolean | undefined;
  loading?: boolean | undefined;
  flashKey?: string | number | null | undefined;
}) {
  const t = useT();
  const d = useDraft<string[]>(steps, eqSteps);
  const keysRef = useRef<number[]>([]);
  const counter = useRef(0);
  const listRef = useRef<HTMLOListElement>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  const rows = d.draft.length >= 2 ? d.draft : [...d.draft, ...Array<string>(2 - d.draft.length).fill("")];
  while (keysRef.current.length < rows.length) keysRef.current.push(counter.current++);
  if (keysRef.current.length > rows.length) keysRef.current.length = rows.length;

  function focusRow(i: number, end = true) {
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelectorAll<HTMLInputElement>("input")[i];
      if (!el) return;
      el.focus();
      if (end) el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  function commitNow(next: string[]) {
    d.setDraft(next);
    d.commit();
    onSave(clean(next));
  }

  function edit(i: number, text: string) {
    const next = [...rows];
    next[i] = text;
    d.setDraft(next);
  }

  function insertAfter(i: number) {
    const next = [...rows];
    next.splice(i + 1, 0, "");
    keysRef.current.splice(i + 1, 0, counter.current++);
    d.setDraft(next);
    focusRow(i + 1);
  }

  function remove(i: number) {
    const next = rows.filter((_, j) => j !== i);
    keysRef.current.splice(i, 1);
    commitNow(next);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= rows.length || from === to) return;
    const next = [...rows];
    const [item] = next.splice(from, 1);
    const [key] = keysRef.current.splice(from, 1);
    if (item === undefined || key === undefined) return;
    next.splice(to, 0, item);
    keysRef.current.splice(to, 0, key);
    commitNow(next);
    focusRow(to);
  }

  function onListBlur(e: React.FocusEvent<HTMLOListElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    if (d.dirty) {
      d.commit();
      onSave(clean(d.draft));
    }
  }

  const addButton = readOnly ? null : (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={() => {
        const next = [...rows, ""];
        keysRef.current.push(counter.current++);
        d.setDraft(next);
        focusRow(next.length - 1);
      }}
    >
      <IconPlus aria-hidden="true" />
      {t("report.addStep")}
    </Button>
  );

  return (
    <FieldShell
      id="report-steps"
      label={t("report.steps")}
      provenance={provenance}
      missing={missing}
      labelAction={addButton}
      flashKey={flashKey}
      hint={
        d.hasConflict ? (
          <>
            {t("report.agentUpdated")}{" "}
            <Button variant="link" size="xs" className="h-auto p-0" onClick={d.useRemote}>
              {t("report.useAgentVersion")}
            </Button>
          </>
        ) : undefined
      }
      className={undefined}
    >
      {loading ? (
        <div aria-busy="true" className="flex flex-col gap-2 py-1">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ) : (
        <ol
          ref={listRef}
          className="flex flex-col"
          onBlur={onListBlur}
          aria-label={t("report.steps")}
        >
          {rows.map((text, i) => (
            <li
              key={keysRef.current[i]}
              onDragOver={(e) => dragFrom != null && e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFrom != null) move(dragFrom, i);
                setDragFrom(null);
              }}
              className={cn(
                "group/step relative -mx-2 flex min-h-9 items-center gap-1.5 rounded-md px-2 hover:bg-accent/40 focus-within:bg-accent/40",
                dragFrom === i && "opacity-50",
              )}
            >
              {readOnly ? (
                <span className="size-3.5" />
              ) : (
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    setDragFrom(i);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => setDragFrom(null)}
                  aria-label={t("report.reorderStep", { n: i + 1 })}
                  onKeyDown={(e) => {
                    if (e.altKey && e.key === "ArrowUp") {
                      e.preventDefault();
                      move(i, i - 1);
                    } else if (e.altKey && e.key === "ArrowDown") {
                      e.preventDefault();
                      move(i, i + 1);
                    }
                  }}
                  className="cursor-grab rounded-sm text-muted-foreground opacity-0 outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-focus-within/step:opacity-100 group-hover/step:opacity-100"
                >
                  <IconGripVertical aria-hidden="true" className="size-3.5" />
                </button>
              )}
              <span className="w-5 shrink-0 text-end font-mono text-xs tabular-nums text-muted-foreground">
                {i + 1}.
              </span>
              <Input
                id={i === 0 ? "report-steps" : undefined}
                value={text}
                aria-label={t("report.stepN", { n: i + 1 })}
                placeholder={i === 0 ? t("report.firstStep") : t("report.nextStep")}
                readOnly={readOnly}
                onChange={(e) => edit(i, e.target.value)}
                onKeyDown={(e) => {
                  if (readOnly) return;
                  if (e.altKey && e.key === "ArrowUp") {
                    e.preventDefault();
                    move(i, i - 1);
                  } else if (e.altKey && e.key === "ArrowDown") {
                    e.preventDefault();
                    move(i, i + 1);
                  } else if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    if ((e.metaKey || e.ctrlKey)) (e.target as HTMLElement).blur();
                    else insertAfter(i);
                  } else if (e.key === "Backspace" && text === "" && rows.length > 1 && i > 0) {
                    e.preventDefault();
                    const next = rows.filter((_, j) => j !== i);
                    keysRef.current.splice(i, 1);
                    d.setDraft(next);
                    focusRow(i - 1);
                  }
                }}
                className={cn(
                  quietInput,
                  "h-8 text-sm",
                  missing && !text && missingOutline,
                  readOnly && "hover:border-transparent",
                )}
              />
              {readOnly ? null : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t("report.removeStep", { n: i + 1 })}
                  onClick={() => remove(i)}
                  className="opacity-0 group-focus-within/step:opacity-100 group-hover/step:opacity-100"
                >
                  <IconX aria-hidden="true" />
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}
    </FieldShell>
  );
}
