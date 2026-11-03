import { useT } from "@agent-native/core/client/i18n";

import { cn } from "@/lib/utils";
import type { FailedRequest } from "@shared/repro/types";

import { EmptyState, formatClipTime } from "../ui";
import { EvidenceTime } from "./ConsoleList";

function statusText(r: FailedRequest): { text: string; className: string } {
  if (r.status == null || r.status === 0) {
    return { text: "failed", className: "text-error-ink" };
  }
  if (r.status >= 500) {
    return { text: String(r.status), className: "text-error-ink" };
  }
  if (r.status >= 400) {
    return { text: String(r.status), className: "text-needs-info-ink" };
  }
  return { text: String(r.status), className: "text-muted-foreground" };
}

function duration(ms: number | null | undefined): string | null {
  if (ms == null) return null;
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

export function NetworkList({
  requests,
  citedIds,
  onSeek,
  hasDiagnostics,
}: {
  requests: FailedRequest[];
  citedIds: ReadonlySet<string>;
  onSeek: (atMs: number) => void;
  hasDiagnostics: boolean;
}) {
  const t = useT();
  if (requests.length === 0) {
    return (
      <EmptyState
        size="panel"
        title={t("evidence.noNetwork")}
        description={hasDiagnostics ? undefined : t("evidence.noDiagnostics")}
      />
    );
  }
  return (
    <ul className="flex flex-col">
      {requests.map((r) => {
        const status = statusText(r);
        const dur = duration(r.durationMs);
        return (
          <li
            key={r.id}
            className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-x-2 rounded-md px-1.5 py-1.5 hover:bg-accent/50"
          >
            <EvidenceTime
              atMs={r.atMs}
              onSeek={onSeek}
              label={`Play from ${r.atMs != null ? formatClipTime(r.atMs) : "start"}`}
            />
            <span className="min-w-0">
              <span
                title={r.url}
                className="block truncate font-mono text-xs"
              >
                <span className="font-medium text-foreground">{r.method}</span>{" "}
                <span className="text-muted-foreground">{r.path}</span>
              </span>
              {citedIds.has(r.id) ? (
                <span className="text-2xs text-source-agent-ink">
                  {t("evidence.cited")}
                </span>
              ) : null}
            </span>
            <span className="flex flex-col items-end">
              <span className={cn("font-mono text-xs tabular-nums", status.className)}>
                {status.text}
              </span>
              {dur ? (
                <span className="text-2xs tabular-nums text-muted-foreground">
                  {dur}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
