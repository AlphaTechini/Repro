import { useT } from "@agent-native/core/client/i18n";
import {
  IconAlertTriangle,
  IconCircleX,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { ConsoleIssue } from "@shared/repro/types";

import { EmptyState, formatClipTime } from "../ui";

function LevelGlyph({ level }: { level: ConsoleIssue["level"] }) {
  if (level === "error")
    return <IconCircleX aria-label="Error" className="mt-0.5 size-3.5 text-level-error" />;
  if (level === "warn")
    return <IconAlertTriangle aria-label="Warning" className="mt-0.5 size-3.5 text-level-warn" />;
  return <IconInfoCircle aria-label="Info" className="mt-0.5 size-3.5 text-level-info" />;
}

export function EvidenceTime({
  atMs,
  onSeek,
  label,
}: {
  atMs: number | null;
  onSeek: (atMs: number) => void;
  label: string;
}) {
  if (atMs == null || atMs < 0) {
    return (
      <span className="pt-px font-mono text-2xs tabular-nums text-muted-foreground">
        —
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onSeek(atMs)}
      className="self-start rounded-sm pt-px text-start font-mono text-2xs tabular-nums text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      {formatClipTime(atMs)}
    </button>
  );
}

export function ConsoleList({
  issues,
  citedIds,
  onSeek,
  hasDiagnostics,
}: {
  issues: ConsoleIssue[];
  citedIds: ReadonlySet<string>;
  onSeek: (atMs: number) => void;
  hasDiagnostics: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  if (issues.length === 0) {
    return (
      <EmptyState
        size="panel"
        title={t("evidence.noConsole")}
        description={hasDiagnostics ? undefined : t("evidence.noDiagnostics")}
      />
    );
  }
  return (
    <ul className="flex flex-col">
      {issues.map((issue) => {
        const expanded = open.has(issue.id);
        return (
          <li
            key={issue.id}
            className="grid grid-cols-[2.5rem_1rem_minmax(0,1fr)] items-start gap-x-2 rounded-md px-1.5 py-1.5 hover:bg-accent/50"
          >
            <EvidenceTime
              atMs={issue.atMs}
              onSeek={onSeek}
              label={`Play from ${issue.atMs != null ? formatClipTime(issue.atMs) : "start"}`}
            />
            <LevelGlyph level={issue.level} />
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() =>
                setOpen((prev) => {
                  const next = new Set(prev);
                  if (next.has(issue.id)) next.delete(issue.id);
                  else next.add(issue.id);
                  return next;
                })
              }
              className="min-w-0 rounded-sm text-start outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  "block break-words font-mono text-xs text-foreground",
                  !expanded && "line-clamp-2",
                )}
              >
                {issue.message}
              </span>
            </button>
            {issue.source && expanded ? (
              <pre className="col-start-3 mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap rounded-sm bg-muted/60 p-2 font-mono text-2xs text-muted-foreground">
                {issue.source}
              </pre>
            ) : null}
            {citedIds.has(issue.id) ? (
              <span className="col-start-3 text-2xs text-source-agent-ink">
                {t("evidence.cited")}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
