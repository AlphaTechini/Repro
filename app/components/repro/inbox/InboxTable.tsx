import { useT } from "@agent-native/core/client/i18n";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReportListItem } from "@shared/repro/types";

import { headCell } from "../ui";
import { COL } from "./columns";
import { InboxRow } from "./InboxRow";

const th = cn(headCell, "border-b border-border");

export function InboxTable({
  items,
  freshIds,
  hasMore,
  onShowMore,
  now,
}: {
  items: ReportListItem[];
  freshIds: ReadonlySet<string>;
  hasMore: boolean;
  onShowMore: () => void;
  now: number;
}) {
  const t = useT();
  const bodyRef = useRef<HTMLTableSectionElement>(null);

  function onKeyDown(e: React.KeyboardEvent<HTMLTableSectionElement>) {
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, select, [contenteditable]")) return;
    const key = e.key;
    const down = key === "ArrowDown" || key === "j" || key === "J";
    const up = key === "ArrowUp" || key === "k" || key === "K";
    if (!down && !up) return;
    const links = Array.from(
      bodyRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-row-link]") ?? [],
    );
    if (!links.length) return;
    e.preventDefault();
    const current = links.indexOf(document.activeElement as HTMLAnchorElement);
    const next = down
      ? Math.min(links.length - 1, current + 1)
      : Math.max(0, current <= 0 ? 0 : current - 1);
    links[next]?.focus();
  }

  return (
    <div>
      <table className="w-full table-fixed border-collapse [&_tr>:first-child]:ps-4 [&_tr>:last-child]:pe-4" aria-label={t("reports.tableLabel")}>
        <thead className="sticky top-0 z-10 bg-background">
          <tr>
            <th scope="col" className={cn(th, COL.status)}>
              <span className="@5xl:hidden sr-only">{t("reports.colStatus")}</span>
              <span className="hidden @5xl:inline">{t("reports.colStatus")}</span>
            </th>
            <th scope="col" className={th}>
              {t("reports.colTitle")}
            </th>
            <th scope="col" className={cn(th, COL.severity)}>
              <span className="sr-only @5xl:not-sr-only">{t("reports.colSeverity")}</span>
            </th>
            <th scope="col" className={cn(th, COL.complete)}>
              {t("reports.colComplete")}
            </th>
            <th scope="col" className={cn(th, COL.reporter)}>
              {t("reports.colReporter")}
            </th>
            <th scope="col" className={cn(th, COL.created, "text-end")}>
              {t("reports.colCreated")}
            </th>
            <th scope="col" className={cn(th, COL.issue, "text-end")}>
              {t("reports.colIssue")}
            </th>
            <th scope="col" className={cn(th, COL.fixReady, "text-end")}>
              {t("reports.colFixReady")}
            </th>
          </tr>
        </thead>
        <tbody ref={bodyRef} onKeyDown={onKeyDown}>
          {items.map((item) => (
            <InboxRow
              key={item.id}
              item={item}
              fresh={freshIds.has(item.id)}
              now={now}
              untitled={t("reports.untitled")}
            />
          ))}
        </tbody>
      </table>
      {hasMore ? (
        <div className="flex justify-center py-3">
          <Button variant="ghost" size="sm" onClick={onShowMore}>
            {t("reports.showMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
