import { useT } from "@agent-native/core/client/i18n";
import { IconArrowDown, IconArrowUp } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { cn } from "@/lib/utils";
import type { Metrics, ReportMetrics } from "@shared/repro/types";

import {
  CompletenessMeter,
  QuestionPips,
  SplitBar,
  StatusPill,
  bodyCell,
  formatDuration,
  formatRelative,
  headCell,
} from "../ui";

type SortKey = "title" | "status" | "fix" | "questions" | "fields" | "complete" | "filed";

const th = cn(headCell, "border-b border-border");

function value(r: ReportMetrics, k: SortKey): number | string {
  switch (k) {
    case "title":
      return (r.title ?? "").toLowerCase();
    case "status":
      return r.status;
    case "fix":
      return r.timeToFixReadyMs ?? -1;
    case "questions":
      return r.followupCount;
    case "fields":
      return r.agentFields / Math.max(1, r.agentFields + r.humanFields);
    case "complete":
      return r.completenessAtFiling ?? -1;
    case "filed":
      return new Date(r.createdAt).getTime();
  }
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] ?? null) : (((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2);
}

export function MetricsTable({ metrics }: { metrics: Metrics }) {
  const t = useT();
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "filed",
    dir: "desc",
  });
  const rows = useMemo(() => {
    const sorted = [...metrics.reports].sort((a, b) => {
      const av = value(a, sort.key);
      const bv = value(b, sort.key);
      const c = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.dir === "asc" ? c : -c;
    });
    return sorted;
  }, [metrics.reports, sort]);

  const fix = median(
    metrics.reports.map((r) => r.timeToFixReadyMs).filter((x): x is number => x != null),
  );
  const totals = metrics.totals;

  function header(key: SortKey, label: string, className?: string, end = false) {
    const active = sort.key === key;
    return (
      <th
        scope="col"
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
        className={cn(th, className)}
      >
        <button
          type="button"
          onClick={() =>
            setSort((s) =>
              s.key === key
                ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
                : { key, dir: "desc" },
            )
          }
          className={cn(
            "inline-flex items-center gap-1 rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
            end && "flex-row-reverse",
          )}
        >
          {label}
          {active ? (
            sort.dir === "asc" ? (
              <IconArrowUp aria-hidden="true" className="size-3" />
            ) : (
              <IconArrowDown aria-hidden="true" className="size-3" />
            )
          ) : null}
        </button>
      </th>
    );
  }

  return (
    <table className="w-full table-fixed border-collapse">
      <thead>
        <tr>
          {header("title", t("metrics.colReport"))}
          {header("status", t("reports.colStatus"), "w-12")}
          {header("fix", t("reports.colFixReady"), "w-24 text-end", true)}
          {header("questions", t("metrics.colQuestions"), "w-24")}
          {header("fields", t("metrics.colAgentHuman"), "hidden @2xl:table-cell w-36")}
          {header("complete", t("reports.colComplete"), "w-28")}
          {header("filed", t("metrics.colFiled"), "hidden @xl:table-cell w-20 text-end", true)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.id}
            className="h-11 border-b border-border transition-colors duration-100 hover:bg-accent/50"
          >
            <td className={cn(bodyCell, "min-w-0")}>
              <Link
                to={`/reports/${encodeURIComponent(r.id)}`}
                className="block truncate rounded-sm text-md font-medium text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {r.title?.trim() || t("reports.untitled")}
              </Link>
            </td>
            <td className={bodyCell}>
              <StatusPill status={r.status} variant="icon" />
            </td>
            <td className={cn(bodyCell, "text-end tabular-nums")}>
              {r.timeToFixReadyMs != null ? (
                formatDuration(r.timeToFixReadyMs)
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </td>
            <td className={bodyCell}>
              <span className="inline-flex items-center gap-2">
                <QuestionPips count={r.followupCount} />
                <span className="text-2xs tabular-nums text-muted-foreground">{r.followupCount}</span>
              </span>
            </td>
            <td className={cn(bodyCell, "hidden @2xl:table-cell")}>
              <span className="inline-flex items-center gap-2">
                <SplitBar agent={r.agentFields} human={r.humanFields} className="w-16" />
                <span className="text-2xs tabular-nums text-muted-foreground">
                  {r.agentFields} · {r.humanFields}
                </span>
              </span>
            </td>
            <td className={bodyCell}>
              {r.completenessAtFiling != null ? (
                <CompletenessMeter percent={r.completenessAtFiling} size="sm" />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </td>
            <td className={cn(bodyCell, "hidden @xl:table-cell text-end tabular-nums text-muted-foreground")}>
              {formatRelative(r.createdAt)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="h-11 border-t border-border text-md font-medium">
          <td className={bodyCell}>{t("metrics.footerLabel")}</td>
          <td className={cn(bodyCell, "tabular-nums")}>{totals.reports}</td>
          <td className={cn(bodyCell, "text-end tabular-nums")}>
            {fix != null ? formatDuration(fix) : "—"}
          </td>
          <td className={cn(bodyCell, "tabular-nums")}>
            {totals.avgFollowups != null ? totals.avgFollowups.toFixed(1) : "—"}
          </td>
          <td className={cn(bodyCell, "hidden @2xl:table-cell tabular-nums")}>
            {totals.agentFields + totals.humanFields > 0
              ? `${Math.round((totals.agentFields / (totals.agentFields + totals.humanFields)) * 100)}%`
              : "—"}
          </td>
          <td className={cn(bodyCell, "tabular-nums")}>
            {totals.avgCompletenessAtFiling != null
              ? `${Math.round(totals.avgCompletenessAtFiling)}%`
              : "—"}
          </td>
          <td className={cn(bodyCell, "hidden @xl:table-cell")} />
        </tr>
      </tfoot>
    </table>
  );
}
