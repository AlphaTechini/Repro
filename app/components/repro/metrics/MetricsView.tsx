import {
  actionErrorMessage,
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useT } from "@agent-native/core/client/i18n";
import { useSetHeaderActions, useSetPageTitle } from "@agent-native/toolkit/app-shell";
import { IconDownload } from "@tabler/icons-react";
import { Link } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

import {
  EmptyState,
  KpiStrip,
  KpiTile,
  Notice,
  QuestionPips,
  SplitBar,
  formatDuration,
  sectionLabel,
} from "../ui";
import { MetricsTable } from "./MetricsTable";

export function MetricsView() {
  const t = useT();
  const query = useActionQuery("get-metrics", {});
  const exporter = useActionMutation("export-metrics");
  const metrics = query.data;

  useSetPageTitle(t("metrics.title"));
  useSetHeaderActions(
    <Button
      variant="outline"
      size="sm"
      disabled={exporter.isPending}
      onClick={() =>
        exporter.mutate(
          {},
          {
            onSuccess: (r: { path: string }) => {
              const rel = r.path.includes("evidence/")
                ? r.path.slice(r.path.indexOf("evidence/"))
                : r.path;
              toast.success(t("metrics.exported", { path: rel }));
            },
            onError: (err: unknown) => toast.error(actionErrorMessage(err)),
          },
        )
      }
    >
      {exporter.isPending ? <Spinner /> : <IconDownload aria-hidden="true" />}
      {t("metrics.export")}
    </Button>,
  );

  const totals = metrics?.totals;
  const loading = query.isLoading;
  const filed = totals?.filed ?? 0;
  const total = totals?.reports ?? 0;
  const empty = !loading && !query.isError && total === 0;
  const fieldsTotal = (totals?.agentFields ?? 0) + (totals?.humanFields ?? 0);
  const agentPct = fieldsTotal > 0 ? Math.round(((totals?.agentFields ?? 0) / fieldsTotal) * 100) : null;
  const completePct = totals?.avgCompletenessAtFiling != null ? Math.round(totals.avgCompletenessAtFiling) : null;
  const fullCount = metrics?.reports.filter((r) => r.status === "filed" && r.completenessAtFiling === 100).length ?? 0;
  const avgQ = totals?.avgFollowups ?? null;

  return (
    <div className="@container min-h-full">
      <div className="flex w-full max-w-[76rem] flex-col gap-10 px-4 pb-16 pt-6">
        {query.isError ? (
          <Notice
            tone="danger"
            title={t("metrics.loadError")}
            actions={
              <Button size="xs" variant="outline" onClick={() => query.refetch()}>
                {t("reports.retry")}
              </Button>
            }
          >
            {actionErrorMessage(query.error)}
          </Notice>
        ) : null}
        <KpiStrip>
          <KpiTile
            label={t("metrics.kpiMedian")}
            loading={loading}
            value={totals?.medianTimeToFixReadyMs != null ? formatDuration(totals.medianTimeToFixReadyMs) : "—"}
            footnote={filed > 0 ? t("metrics.acrossFiled", { count: filed }) : t("metrics.noFiledYet")}
          />
          <KpiTile
            label={t("metrics.kpiQuestions")}
            loading={loading}
            value={avgQ != null ? avgQ.toFixed(1) : "—"}
            unit={avgQ != null ? t("metrics.perReport") : undefined}
            target={{ label: "≤ 3", met: avgQ != null ? avgQ <= 3 : null }}
            footnote={total > 0 ? t("metrics.acrossReports", { count: total }) : undefined}
          >
            {avgQ != null ? <QuestionPips count={Math.round(avgQ)} /> : null}
          </KpiTile>
          <KpiTile
            label={t("metrics.kpiAgentFields")}
            loading={loading}
            value={agentPct != null ? `${agentPct}%` : "—"}
            footnote={
              agentPct != null
                ? t("metrics.agentHuman", { a: totals?.agentFields ?? 0, h: totals?.humanFields ?? 0 })
                : undefined
            }
          >
            {agentPct != null ? (
              <SplitBar agent={totals?.agentFields ?? 0} human={totals?.humanFields ?? 0} />
            ) : null}
          </KpiTile>
          <KpiTile
            label={t("metrics.kpiComplete")}
            loading={loading}
            value={completePct != null ? `${completePct}%` : "—"}
            target={{ label: "100%", met: completePct != null ? completePct === 100 : null }}
            footnote={filed > 0 ? t("metrics.xOfN", { x: fullCount, count: filed }) : t("metrics.noFiledYet")}
          />
        </KpiStrip>

        <section aria-labelledby="metrics-reports">
          <h2 id="metrics-reports" className={`${sectionLabel} mb-3`}>
            {t("metrics.reportsLabel")}
          </h2>
          {loading ? (
            <div className="flex flex-col">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex h-11 items-center gap-4 border-b border-border px-3">
                  <Skeleton className="h-3.5 w-[40%]" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          ) : empty ? (
            <EmptyState size="panel" title={t("metrics.emptyTitle")} description={t("metrics.emptyBody")}>
              <Button variant="outline" size="sm" asChild>
                <Link to="/reports">{t("metrics.openReports")}</Link>
              </Button>
            </EmptyState>
          ) : metrics ? (
            <MetricsTable metrics={metrics} />
          ) : null}
        </section>
      </div>
    </div>
  );
}
