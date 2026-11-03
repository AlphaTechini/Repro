import { useT } from "@agent-native/core/client/i18n";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { parseClipTimeInput } from "../lib/fields";
import { useDraft, useHeldFlashKey } from "../lib/use-draft";
import { FieldShell, fieldA11y, missingOutline, quietInput } from "../ui";
import { formatClipTime } from "../ui";

/** The moment in the recording where it breaks: "m:ss" in, ms stored. */
export function BreaksAtField({
  valueMs,
  onSave,
  provenance,
  missing,
  readOnly,
  flashKey,
}: {
  valueMs: number | null;
  onSave: (value: string | null) => void;
  provenance?: ReactNode;
  missing?: boolean | undefined;
  readOnly?: boolean | undefined;
  flashKey?: string | number | null | undefined;
}) {
  const t = useT();
  const remote = valueMs != null ? formatClipTime(valueMs) : "";
  const d = useDraft<string>(remote);
  const held = useHeldFlashKey(flashKey, d.hasConflict);
  const [error, setError] = useState<string | null>(null);
  const id = "report-breaksAt";

  function commit() {
    const raw = d.draft.trim();
    if (!d.dirty && !error) return;
    if (raw === "") {
      setError(null);
      d.commit();
      if (remote !== "") onSave(null);
      return;
    }
    const ms = parseClipTimeInput(raw);
    if (ms == null) {
      setError(t("report.breaksAtError"));
      return;
    }
    setError(null);
    const text = formatClipTime(ms);
    d.setDraft(text);
    d.commit();
    if (text !== remote) onSave(text);
  }

  const hint = d.hasConflict ? (
    <>
      {t("report.agentUpdated")}{" "}
      <Button variant="link" size="xs" className="h-auto p-0" onClick={d.useRemote}>
        {t("report.useAgentVersion")}
      </Button>
    </>
  ) : undefined;

  return (
    <FieldShell
      id={id}
      layout="inline"
      label={t("report.breaksAt")}
      provenance={provenance}
      missing={missing}
      error={error}
      hint={hint}
      flashKey={held}
    >
      <Input
        id={id}
        value={d.draft}
        inputMode="numeric"
        placeholder={t("report.breaksAtPlaceholder")}
        readOnly={readOnly}
        onChange={(e) => {
          setError(null);
          d.setDraft(e.target.value);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLElement).blur();
        }}
        {...fieldA11y(id, { error, hint: !!hint })}
        className={cn(
          quietInput,
          "mx-0 h-8 w-24 font-mono text-sm tabular-nums",
          missing && missingOutline,
          readOnly && "hover:border-transparent",
        )}
      />
    </FieldShell>
  );
}
