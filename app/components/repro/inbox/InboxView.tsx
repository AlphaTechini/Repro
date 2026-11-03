import { useActionQuery, actionErrorMessage } from "@agent-native/core/client/hooks";
import { useT } from "@agent-native/core/client/i18n";
import { useSetHeaderActions, useSetPageTitle } from "@agent-native/toolkit/app-shell";
import { IconPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import type { ReportListItem } from "@shared/repro/types";

import { parseClipLink } from "../lib/clip-link";
import { NewReportDialog } from "../new-report/NewReportDialog";
import { EmptyState, Notice } from "../ui";
import { InboxFilterTabs, isInboxFilter, type InboxCounts, type InboxFilter } from "./InboxFilterTabs";
import { InboxFirstRun } from "./InboxFirstRun";
import { InboxSkeleton } from "./InboxSkeleton";
import { InboxTable } from "./InboxTable";

const PAGE = 200;

const EMPTY_KEY: Record<InboxFilter, string> = {
  all: "reports.emptyAll",
  "needs-info": "reports.emptyNeedsInfo",
  ready: "reports.emptyReady",
  filed: "reports.emptyFiled",
  duplicate: "reports.emptyDuplicate",
};

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) ||
    el.closest("[role=dialog]") != null
  );
}

/** Show a skeleton only after `ms`, so fast loads never flash. */
function useDelayedFlag(active: boolean, ms: number) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    const id = window.setTimeout(() => setShown(true), ms);
    return () => window.clearTimeout(id);
  }, [active, ms]);
  return shown;
}

export function InboxView() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const statusParam = params.get("status");
  const filter: InboxFilter = isInboxFilter(statusParam) ? statusParam : "all";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pasted, setPasted] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);

  const list = useActionQuery("list-reports", {});
  const settings = useActionQuery("get-settings", {});
  const reports: ReportListItem[] | undefined = list.data?.reports;
  const githubConnected = settings.data
    ? settings.data.githubInstallationId != null
    : undefined;

  const sorted = useMemo(
    () =>
      reports
        ? [...reports].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )
        : undefined,
    [reports],
  );

  const counts: InboxCounts | undefined = useMemo(() => {
    if (!sorted) return undefined;
    const c: InboxCounts = {
      all: sorted.length,
      "needs-info": 0,
      ready: 0,
      filed: 0,
      duplicate: 0,
    };
    for (const r of sorted) {
      if (r.status !== "draft") c[r.status] += 1;
    }
    return c;
  }, [sorted]);

  const filtered = useMemo(
    () =>
      sorted
        ? filter === "all"
          ? sorted
          : sorted.filter((r) => r.status === filter)
        : undefined,
    [sorted, filter],
  );

  // Rows that appear after the first load fade in.
  const seen = useRef<Set<string> | null>(null);
  const [freshIds, setFreshIds] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    if (!sorted) return;
    if (seen.current === null) {
      seen.current = new Set(sorted.map((r) => r.id));
      return;
    }
    const added = sorted.filter((r) => !seen.current?.has(r.id)).map((r) => r.id);
    if (added.length) {
      added.forEach((id) => seen.current?.add(id));
      setFreshIds((prev) => new Set([...prev, ...added]));
    }
  }, [sorted]);

  const setFilter = useCallback(
    (next: InboxFilter) => {
      setVisible(PAGE);
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === "all") p.delete("status");
          else p.set("status", next);
          return p;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const openDialog = useCallback((link?: string) => {
    setPasted(link ?? null);
    setDialogOpen(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === "c" || e.key === "C") && !isTyping(e.target)) {
        e.preventDefault();
        openDialog();
      }
    }
    function onPaste(e: ClipboardEvent) {
      if (isTyping(e.target)) return;
      const text = e.clipboardData?.getData("text") ?? "";
      if (parseClipLink(text).ok) {
        e.preventDefault();
        openDialog(text.trim());
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, [openDialog]);

  useSetPageTitle(
    <span className="flex items-baseline gap-2">
      {t("reports.title")}
      {counts && counts.all > 0 ? (
        <span className="text-xs font-normal tabular-nums text-muted-foreground">
          {counts.all}
        </span>
      ) : null}
    </span>,
  );
  useSetHeaderActions(
    <Button size="sm" onClick={() => openDialog()}>
      <IconPlus aria-hidden="true" />
      {t("reports.newReport")}
      <Kbd className="hidden border-0 bg-primary-foreground/15 text-primary-foreground/80 md:inline-flex" aria-hidden="true">
        C
      </Kbd>
    </Button>,
  );

  const showSkeleton = useDelayedFlag(list.isLoading, 150);
  const firstRun = sorted !== undefined && sorted.length === 0;
  const now = Date.now();

  const shown = filtered?.slice(0, visible);

  return (
    <div className="@container min-h-full">
      {firstRun ? (
        <InboxFirstRun githubConnected={githubConnected} />
      ) : (
        <>
          <InboxFilterTabs value={filter} onChange={setFilter} counts={counts} />
          {list.isError ? (
            <div className="px-4 pt-4">
              <Notice
                tone="danger"
                title={t("reports.loadError")}
                actions={
                  <Button size="xs" variant="outline" onClick={() => list.refetch()}>
                    {t("reports.retry")}
                  </Button>
                }
              >
                {actionErrorMessage(list.error)}
              </Notice>
            </div>
          ) : null}
          {list.isLoading ? (
            showSkeleton ? <InboxSkeleton /> : null
          ) : shown && shown.length > 0 ? (
            <InboxTable
              items={shown}
              freshIds={freshIds}
              now={now}
              hasMore={(filtered?.length ?? 0) > visible}
              onShowMore={() => setVisible((v) => v + PAGE)}
            />
          ) : shown ? (
            <EmptyState size="panel" title={t(EMPTY_KEY[filter])} />
          ) : null}
        </>
      )}
      <NewReportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialLink={pasted}
      />
    </div>
  );
}
