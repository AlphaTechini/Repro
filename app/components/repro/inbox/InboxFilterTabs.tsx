import { useT } from "@agent-native/core/client/i18n";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type InboxFilter = "all" | "needs-info" | "ready" | "filed" | "duplicate";

export const INBOX_FILTERS: readonly InboxFilter[] = [
  "all",
  "needs-info",
  "ready",
  "filed",
  "duplicate",
];

export function isInboxFilter(value: string | null): value is InboxFilter {
  return INBOX_FILTERS.includes(value as InboxFilter);
}

export type InboxCounts = Record<InboxFilter, number>;

const LABEL_KEY: Record<InboxFilter, string> = {
  all: "reports.filterAll",
  "needs-info": "reports.filterNeedsInfo",
  ready: "reports.filterReady",
  filed: "reports.filterFiled",
  duplicate: "reports.filterDuplicate",
};

export function InboxFilterTabs({
  value,
  onChange,
  counts,
}: {
  value: InboxFilter;
  onChange: (value: InboxFilter) => void;
  /** undefined while loading. */
  counts: InboxCounts | undefined;
}) {
  const t = useT();
  return (
    <div className="flex h-11 items-center gap-3 border-b border-border px-4 @3xl:px-8">
      <div className="min-w-0 overflow-x-auto [scrollbar-width:none]">
        <Tabs
          value={value}
          onValueChange={(v) => isInboxFilter(v) && onChange(v)}
        >
          <TabsList className="h-8" aria-label={t("reports.filterLabel")}>
            {INBOX_FILTERS.map((f) => (
              <TabsTrigger key={f} value={f} className="h-6 gap-1.5 px-2.5 text-md">
                {t(LABEL_KEY[f])}
                {counts ? (
                  <span className="text-2xs tabular-nums text-muted-foreground">
                    {counts[f]}
                  </span>
                ) : (
                  <Skeleton className="h-3 w-3" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
