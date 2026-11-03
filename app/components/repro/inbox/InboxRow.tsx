import { useT } from "@agent-native/core/client/i18n";
import { Link, useNavigate } from "react-router";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ReportListItem } from "@shared/repro/types";

import { reporterInitials, reporterName } from "../lib/people";
import {
  CompletenessMeter,
  SeverityBadge,
  StatusPill,
  bodyCell,
  formatDuration,
  formatRelative,
} from "../ui";
import { COL } from "./columns";

type ListItem = ReportListItem & {
  recordingId?: string | undefined;
  clipOrigin?: string | undefined;
  clipReadAt?: string | null | undefined;
};

function hostOf(origin: string | undefined): string | null {
  if (!origin) return null;
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
}

export function InboxRow({
  item,
  fresh,
  now,
  untitled,
}: {
  item: ListItem;
  fresh: boolean;
  now: number;
  untitled: string;
}) {
  const t = useT();
  const navigate = useNavigate();
  const href = `/reports/${encodeURIComponent(item.id)}`;
  const created = new Date(item.createdAt);
  const hasTitle = !!item.title?.trim();
  const unread = item.clipReadAt === null;
  return (
    <tr
      className={cn(
        "group h-13 cursor-pointer border-b border-border transition-colors duration-100 hover:bg-accent/50 has-[a:focus-visible]:bg-accent/60",
        item.errorSignature || !item.title?.trim() ? "h-13" : "h-13 @md:h-11",
        fresh && "animate-in fade-in-0 duration-200",
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button")) return;
        navigate(href);
      }}
    >
      <td
        className={cn(
          bodyCell,
          COL.status,
          "group-has-[a[data-row-link]:focus-visible]:repro-row-focus",
        )}
      >
        <span className="@5xl:hidden">
          <StatusPill status={item.status} variant="icon" />
        </span>
        <span className="hidden @5xl:inline-flex">
          <StatusPill status={item.status} variant="plain" />
        </span>
      </td>
      <td className={cn(bodyCell, "min-w-0")}>
        <Link
          to={href}
          data-row-link
          className={cn(
            "block truncate text-md outline-none",
            hasTitle ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {hasTitle
            ? item.title
            : item.recordingId
              ? t("reports.clipN", { id: item.recordingId })
              : untitled}
        </Link>
        {hasTitle && item.errorSignature ? (
          <span
            title={item.errorSignature}
            className="block truncate font-mono text-2xs tabular-nums text-muted-foreground"
          >
            {item.errorSignature}
          </span>
        ) : !hasTitle && item.recordingId ? (
          <span className="flex items-center gap-1.5 truncate font-mono text-2xs text-muted-foreground">
            {unread ? (
              <>
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-source-agent animate-repro-breathe"
                />
                {t("reports.readingRecording")}
              </>
            ) : (
              hostOf(item.clipOrigin)
            )}
          </span>
        ) : null}
        <span className="mt-0.5 flex items-center gap-2 text-2xs text-muted-foreground @md:hidden">
          <CompletenessMeter percent={item.completeness} size="sm" />
          <span className="tabular-nums">{formatRelative(created, now)}</span>
        </span>
      </td>
      <td className={cn(bodyCell, COL.severity)}>
        <span className="@5xl:hidden">
          <SeverityBadge severity={item.severity} variant="icon" />
        </span>
        <span className="hidden @5xl:inline-flex">
          <SeverityBadge severity={item.severity} />
        </span>
      </td>
      <td className={cn(bodyCell, COL.complete)}>
        {unread && item.completeness === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <CompletenessMeter percent={item.completeness} size="sm" />
        )}
      </td>
      <td className={cn(bodyCell, COL.reporter)}>
        <span className="flex min-w-0 items-center gap-2 text-md text-muted-foreground">
          <Avatar className="size-5 shrink-0">
            <AvatarFallback className="text-2xs">
              {reporterInitials(item.ownerEmail)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{reporterName(item.ownerEmail)}</span>
        </span>
      </td>
      <td
        className={cn(
          bodyCell,
          COL.created,
          "text-end text-md tabular-nums text-muted-foreground",
        )}
        title={created.toLocaleString()}
      >
        {formatRelative(created, now)}
      </td>
      <td className={cn(bodyCell, COL.issue, "text-end")}>
        {item.githubIssueNumber != null && item.githubIssueUrl ? (
          <a
            href={item.githubIssueUrl}
            target="_blank"
            rel="noreferrer"
            className="relative z-10 text-md tabular-nums text-foreground underline-offset-2 hover:underline"
          >
            #{item.githubIssueNumber}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className={cn(bodyCell, COL.fixReady, "text-end tabular-nums")}>
        {item.timeToFixReadyMs != null ? (
          formatDuration(item.timeToFixReadyMs)
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}
