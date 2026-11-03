import { useT } from "@agent-native/core/client/i18n";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { SEVERITIES, SEVERITY_LABEL, SeverityGlyph, type Severity } from "../ui";

export function SeverityPicker({
  value,
  onChange,
  disabled,
  id,
}: {
  value: Severity | null;
  onChange: (value: Severity) => void;
  disabled?: boolean | undefined;
  id?: string | undefined;
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
      className="w-fit gap-0 rounded-md border border-input p-0.5"
      aria-label={t("report.severity")}
    >
      {SEVERITIES.map((s) => (
        <ToggleGroupItem
          key={s}
          value={s}
          aria-label={SEVERITY_LABEL[s]}
          className="h-7 gap-1.5 rounded-sm border-0 px-2.5 text-md text-muted-foreground data-[state=on]:bg-accent data-[state=on]:font-medium data-[state=on]:text-foreground"
        >
          <SeverityGlyph severity={s} />
          <span className="hidden in-data-[state=on]:inline @lg:inline">{SEVERITY_LABEL[s]}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
