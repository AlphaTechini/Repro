import { useT } from "@agent-native/core/client/i18n";
import type { ReactNode } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isFieldPresent } from "@shared/repro/lib/completeness";
import type {
  Frequency,
  Report,
  ReportField,
  RequirableField,
  Severity,
} from "@shared/repro/types";

import { AGENT_FILLABLE, FREQUENCY_ORDER } from "../lib/fields";
import type { FieldChange } from "../lib/use-report-data";
import { FieldShell, ProvenanceMark, fieldA11y } from "../ui";
import { BreaksAtField } from "./BreaksAtField";
import { ReportTextField } from "./ReportTextField";
import { SeverityPicker } from "./SeverityPicker";
import { sourcePreview } from "./SourcePreview";
import { StepsEditor } from "./StepsEditor";

export interface ReportFormProps {
  report: Report;
  requiredFields: readonly RequirableField[];
  /** field -> id of the latest agent field_set event; undefined until loaded. */
  flashKeys: Partial<Record<string, string>> | undefined;
  /** Fields the agent wrote in the last few seconds (chip pop-in). */
  freshFields: ReadonlySet<string>;
  /** The clip has been read (or reading gave up): flag missing fields. */
  readingEnded: boolean;
  readOnly: boolean;
  notices: ReactNode;
  activityLine: ReactNode;
  activity: ReactNode;
  onSave: (changes: FieldChange[]) => void;
  onSeek: (atMs: number) => void;
}

const FREQ_KEY: Record<Frequency, string> = {
  always: "report.freqAlways",
  often: "report.freqOften",
  sometimes: "report.freqSometimes",
  once: "report.freqOnce",
};

export function ReportForm({
  report,
  requiredFields,
  flashKeys,
  freshFields,
  readingEnded,
  readOnly,
  notices,
  activityLine,
  activity,
  onSave,
  onSeek,
}: ReportFormProps) {
  const t = useT();
  const required = new Set<string>(requiredFields);

  function isMissing(field: RequirableField): boolean {
    return readingEnded && required.has(field) && !isFieldPresent(field, report);
  }

  function mark(field: ReportField, hasValue: boolean): ReactNode {
    const p = report.fieldSources[field];
    if (!p || !hasValue) return null;
    return (
      <ProvenanceMark
        provenance={p}
        onSeek={onSeek}
        fresh={freshFields.has(field)}
        preview={p.source ? sourcePreview(report.id, report.evidence, p.source) : undefined}
      />
    );
  }

  const pending = !readingEnded;
  const text = (
    field: "title" | "summary" | "expected" | "actual" | "environment",
    props: {
      label: string;
      placeholder: string;
      layout?: "inline";
      single?: boolean;
      variant?: "title";
      requirable?: RequirableField;
    },
  ) => {
    const value = report[field] ?? "";
    return (
      <ReportTextField
        id={`report-${field}`}
        label={props.label}
        placeholder={props.placeholder}
        value={value}
        onSave={(v) => onSave([{ field, value: v }])}
        provenance={mark(field, value.trim() !== "")}
        missing={props.requirable ? isMissing(props.requirable) : false}
        pending={pending && AGENT_FILLABLE.includes(field)}
        readOnly={readOnly}
        flashKey={flashKeys?.[field]}
        layout={props.layout}
        single={props.single}
        variant={props.variant}
      />
    );
  };

  const stepsMissing = isMissing("steps");
  const freqMissing = isMissing("frequency");
  const sevMissing = isMissing("severity");

  return (
    <section aria-label={t("report.formLabel")} className="@container flex min-w-0 max-w-[44rem] flex-col gap-8">
      {notices}
      {activityLine}
      {text("title", {
        label: t("report.title"),
        placeholder: t("report.titlePlaceholder"),
        variant: "title",
        requirable: "title",
      })}

      <div className="flex flex-col gap-1">
        <FieldShell
          id="report-severity"
          layout="inline"
          label={t("report.severity")}
          provenance={mark("severity", report.severity != null)}
          missing={sevMissing}
          flashKey={flashKeys?.severity}
        >
          <SeverityPicker
            id="report-severity"
            value={report.severity}
            disabled={readOnly}
            onChange={(v: Severity) => onSave([{ field: "severity", value: v }])}
          />
        </FieldShell>
        <FieldShell
          id="report-frequency"
          layout="inline"
          label={t("report.frequency")}
          provenance={mark("frequency", report.frequency != null)}
          missing={freqMissing}
          flashKey={flashKeys?.frequency}
        >
          <Select
            value={report.frequency ?? ""}
            disabled={readOnly}
            onValueChange={(v) => onSave([{ field: "frequency", value: v }])}
          >
            <SelectTrigger
              id="report-frequency"
              className="h-8 w-48 text-sm"
              {...fieldA11y("report-frequency")}
            >
              <SelectValue placeholder={t("report.frequencyPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_ORDER.map((f) => (
                <SelectItem key={f} value={f}>
                  {t(FREQ_KEY[f])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldShell>
        {text("environment", {
          label: t("report.environment"),
          placeholder: t("report.environmentPlaceholder"),
          layout: "inline",
          single: true,
          requirable: "environment",
        })}
        <BreaksAtField
          valueMs={report.breaksAtMs}
          onSave={(v) => onSave([{ field: "breaksAt", value: v }])}
          provenance={mark("breaksAt", report.breaksAtMs != null)}
          missing={isMissing("evidence")}
          readOnly={readOnly}
          flashKey={flashKeys?.breaksAt}
        />
      </div>

      <div className="flex flex-col gap-6">
        {text("summary", {
          label: t("report.summary"),
          placeholder: t("report.summaryPlaceholder"),
        })}
        <StepsEditor
          steps={report.steps}
          onSave={(steps) => onSave([{ field: "steps", value: steps }])}
          provenance={mark("steps", report.steps.length > 0)}
          missing={stepsMissing ? t("report.needsSteps") : false}
          readOnly={readOnly}
          loading={pending && report.steps.length === 0}
          flashKey={flashKeys?.steps}
        />
        {text("expected", {
          label: t("report.expected"),
          placeholder: t("report.expectedPlaceholder"),
          requirable: "expected",
        })}
        {text("actual", {
          label: t("report.actual"),
          placeholder: t("report.actualPlaceholder"),
          requirable: "actual",
        })}
      </div>
      {activity}
    </section>
  );
}
