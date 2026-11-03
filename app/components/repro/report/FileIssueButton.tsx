import { useT } from "@agent-native/core/client/i18n";
import { buildSettingsRoute } from "@agent-native/core/client/navigation";
import { IconArrowUpRight, IconBrandGithub } from "@tabler/icons-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Report, RequirableField } from "@shared/repro/types";

import { FIELD_LABEL } from "../lib/fields";

export interface FileIssueButtonProps {
  report: Report;
  githubConnected: boolean | undefined;
  repoChosen: boolean | undefined;
  missing: RequirableField[];
  percent: number;
  filing: boolean;
  /** Issue the UI just filed, before the report reloads. */
  filedNow: { number: number; url: string } | null;
  onFile: () => void;
}

export function FileIssueButton({
  report,
  githubConnected,
  repoChosen,
  missing,
  percent,
  filing,
  filedNow,
  onFile,
}: FileIssueButtonProps) {
  const t = useT();
  const issueNumber = report.githubIssueNumber ?? filedNow?.number ?? null;
  const issueUrl = report.githubIssueUrl ?? filedNow?.url ?? null;

  if (report.status === "duplicate") {
    return report.duplicateOfId ? (
      <Button variant="outline" size="sm" asChild>
        <Link to={`/reports/${encodeURIComponent(report.duplicateOfId)}`}>
          {t("report.openOriginal")}
        </Link>
      </Button>
    ) : null;
  }

  if (issueNumber != null && issueUrl) {
    return (
      <Button variant="outline" size="sm" className="@max-xl/header:size-8 @max-xl/header:gap-0 @max-xl/header:px-0" asChild>
        <a
          href={issueUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={t("report.openIssueN", { n: issueNumber })}
        >
          <IconBrandGithub aria-hidden="true" />
          <span className="tabular-nums @max-xl/header:sr-only">#{issueNumber}</span>
          <IconArrowUpRight aria-hidden="true" className="size-3 text-muted-foreground @max-xl/header:hidden" />
        </a>
      </Button>
    );
  }

  if (githubConnected === false || repoChosen === false) {
    return (
      <Button variant="outline" size="sm" className="@max-xl/header:size-8 @max-xl/header:gap-0 @max-xl/header:px-0" asChild>
        <Link
          to={buildSettingsRoute("app", "github")}
          aria-label={githubConnected === false ? t("report.connectToFile") : t("report.chooseRepoToFile")}
          title={githubConnected === false ? t("report.connectToFile") : t("report.chooseRepoToFile")}
        >
          <IconBrandGithub aria-hidden="true" />
          <span className="@max-xl/header:sr-only">
            {githubConnected === false ? t("report.connectToFile") : t("report.chooseRepoToFile")}
          </span>
        </Link>
      </Button>
    );
  }

  if (filing) {
    return (
      <Button size="sm" disabled className="@max-xl/header:size-8 @max-xl/header:gap-0 @max-xl/header:px-0" aria-label={t("report.filing")}>
        <Spinner />
        <span className="@max-xl/header:sr-only">{t("report.filing")}</span>
      </Button>
    );
  }

  if (percent < 100) {
    const list = missing.map((f) => FIELD_LABEL[f]).join(", ");
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Button size="sm" disabled tabIndex={-1} className="pointer-events-none @max-xl/header:size-8 @max-xl/header:gap-0 @max-xl/header:px-0" aria-label={t("report.fileIssue")}>
              <IconBrandGithub aria-hidden="true" className="hidden @max-xl/header:block" />
              <span className="@max-xl/header:sr-only">{t("report.fileIssue")}</span>
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {t("report.fillMore", { count: missing.length, list })}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button size="sm" className="@max-xl/header:size-8 @max-xl/header:gap-0 @max-xl/header:px-0" onClick={onFile} disabled={githubConnected === undefined} aria-label={t("report.fileIssue")} title={t("report.fileIssue")}>
      <IconBrandGithub aria-hidden="true" />
      <span className="@max-xl/header:sr-only">{t("report.fileIssue")}</span>
    </Button>
  );
}
