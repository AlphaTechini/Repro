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
      <Button variant="ghost" size="icon-sm" asChild>
        <Link to="/reports" aria-label={t("report.back")}>
          <IconArrowLeft aria-hidden="true" />
        </Link>
      </Button>
      <Link
        to="/reports"
        className="hidden text-muted-foreground hover:text-foreground lg:inline"
      >
        {t("reports.title")}
      </Link>
      <span aria-hidden="true" className="hidden text-muted-foreground/60 lg:inline">
        /
      </span>
      {report ? (
        <>
          <span className={report.title?.trim() ? "truncate" : "truncate text-muted-foreground"}>
            {report.title?.trim() || t("reports.untitled")}
          </span>
          <StatusPill status={report.status} className="hidden sm:inline-flex" />
        </>
      ) : null}
    </div>
  );
}
