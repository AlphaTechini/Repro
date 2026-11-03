import { useT } from "@agent-native/core/client/i18n";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

import { SEVERITIES, SEVERITY_LABEL, SeverityGlyph, type Severity } from "../ui";

export function SeverityPicker({
  value,
  onChange,
  disabled,
  id,
  invalid,
}: {
  value: Severity | null;
  onChange: (value: Severity) => void;
  disabled?: boolean | undefined;
  id?: string | undefined;
  invalid?: boolean | undefined;
}) {
  const t = useT();
  return (
    <ToggleGroup
      id={id}
      type="single"
      variant="outline"
      size="sm"
      value={value ?? ""}
      onValueChange={(v) => v && onChange(v as Severity)}
      disabled={disabled}
      className={cn(
        "w-fit gap-0 rounded-md border p-0.5",
        invalid
          ? "border-dashed border-status-needs-info/55"
          : "border-input",
      )}
      aria-label={t("report.severity")}
    >
      {SEVERITIES.map((s) => (
        <ToggleGroupItem
          key={s}
          value={s}
          aria-label={SEVERITY_LABEL[s]}
          className="h-7 gap-1.5 rounded-sm border-0 px-2.5 text-md text-muted-foreground data-[state=on]:bg-accent data-[state=on]:text-foreground"
        >
          <SeverityGlyph severity={s} />
          <span className="hidden @md:inline">{SEVERITY_LABEL[s]}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
