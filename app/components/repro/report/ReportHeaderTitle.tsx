import { useT } from "@agent-native/core/client/i18n";
import { IconArrowLeft } from "@tabler/icons-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import type { Report } from "@shared/repro/types";

import { StatusPill } from "../ui";

export function ReportHeaderTitle({ report }: { report: Report | undefined }) {
  const t = useT();
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Button variant="ghost" size="icon-sm" className="-ms-2 shrink-0" asChild>
        <Link to="/reports" aria-label={t("report.back")}>
          <IconArrowLeft aria-hidden="true" />
        </Link>
      </Button>
      <Link
        to="/reports"
        className="hidden shrink-0 text-muted-foreground hover:text-foreground @2xl/header:inline"
      >
        {t("reports.title")}
      </Link>
      <span aria-hidden="true" className="hidden shrink-0 text-muted-foreground/60 @2xl/header:inline">
        /
      </span>
      {report ? (
        <>
          <span className={report.title?.trim() ? "min-w-0 flex-1 truncate" : "min-w-0 flex-1 truncate font-normal text-muted-foreground"}>
            {report.title?.trim() || t("reports.clipN", { id: report.recordingId })}
          </span>
          <StatusPill status={report.status} className="hidden shrink-0 @lg/header:inline-flex" />
        </>
      ) : null}
    </div>
  );
}
