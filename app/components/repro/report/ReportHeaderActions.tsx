import type { Report, RequirableField } from "@shared/repro/types";

import { FileIssueButton, type FileIssueButtonProps } from "./FileIssueButton";
import { MissingFieldsPopover } from "./MissingFieldsPopover";

export function ReportHeaderActions({
  report,
  percent,
  missing,
  onPickMissing,
  fileProps,
}: {
  report: Report;
  percent: number;
  missing: RequirableField[];
  onPickMissing: (field: RequirableField) => void;
  fileProps: Omit<FileIssueButtonProps, "report" | "percent" | "missing">;
}) {
  const showMeter = report.status !== "duplicate";
  return (
    <div className="flex items-center gap-3">
      {showMeter ? (
        <MissingFieldsPopover percent={percent} missing={missing} onPick={onPickMissing} />
      ) : null}
      <FileIssueButton report={report} percent={percent} missing={missing} {...fileProps} />
    </div>
  );
}
