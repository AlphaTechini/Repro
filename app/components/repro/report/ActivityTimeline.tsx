import { useT } from "@agent-native/core/client/i18n";
import { IconChevronRight } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReportEvent } from "@shared/repro/types";

import { FIELD_LABEL } from "../lib/fields";
import { formatRelative } from "../ui";

interface Line {
  key: string;
  actor: ReportEvent["actor"];
  kind: ReportEvent["kind"];
  fields: string[];
  detail: string | null;
  at: string;
}

function fieldName(field: string): string {
  return (FIELD_LABEL as Record<string, string>)[field] ?? field.charAt(0).toUpperCase() + field.slice(1);
}

/** Group consecutive field_set events by the same actor within 10s. */
function group(events: ReportEvent[]): Line[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
  const out: Line[] = [];
  for (const e of sorted) {
    const prev = out[out.length - 1];
    if (
      e.kind === "field_set" &&
      prev &&
      prev.kind === "field_set" &&
      prev.actor === e.actor &&
      new Date(e.at).getTime() - new Date(prev.at).getTime() <= 10_000
    ) {
      if (e.field && !prev.fields.includes(e.field)) prev.fields.push(e.field);
      prev.at = e.at;
      continue;
    }
    out.push({
      key: e.id,
      actor: e.actor,
      kind: e.kind,
      fields: e.field ? [e.field] : [],
      detail: e.detail,
      at: e.at,
    });
  }
  return out.reverse();
}

export function ActivityTimeline({
  events,
  issueNumber,
}: {
  events: ReportEvent[];
  issueNumber: number | null;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const lines = useMemo(() => group(events), [events]);
  if (events.length === 0) return null;

  function text(l: Line): { who: string; what: string } {
    switch (l.kind) {
      case "report_created":
        return { who: t("activity.system"), what: t("activity.created") };
      case "clip_read":
        return {
          who: l.actor === "agent" ? t("activity.agent") : t("activity.system"),
          what: t("activity.readClip"),
        };
      case "field_set": {
        const names = l.fields.map(fieldName).join(", ");
        return l.actor === "agent"
          ? { who: t("activity.agent"), what: t("activity.filled", { fields: names }) }
          : { who: t("activity.you"), what: t("activity.set", { fields: names }) };
      }
      case "followup_asked":
        return { who: t("activity.agent"), what: t("activity.asked") };
      case "filed":
        return {
          who: t("activity.bot"),
          what: issueNumber != null ? t("activity.filedN", { n: issueNumber }) : t("activity.filed"),
        };
      case "duplicate_marked":
        return { who: t("activity.you"), what: t("activity.duplicate") };
      case "evidence_merged":
        return { who: t("activity.system"), what: t("activity.merged") };
    }
  }

  function dot(l: Line): string {
    if (l.kind === "filed") return "bg-status-filed";
    if (l.actor === "agent") return "bg-source-agent";
    if (l.actor === "human") return "bg-source-human/70";
    return "bg-status-draft";
  }

  return (
    <div>
      <Button
        variant="ghost-inset"
        size="sm"
        className="-ms-2 px-2"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <IconChevronRight
          aria-hidden="true"
          className={cn("transition-transform duration-150", open && "rotate-90")}
        />
        {t("activity.title")} · {lines.length}
      </Button>
      {open ? (
        <ol className="relative mt-3 flex flex-col gap-3 ps-5 before:absolute before:inset-y-1 before:start-[5px] before:w-px before:bg-border">
          {lines.map((l) => {
            const { who, what } = text(l);
            return (
              <li key={l.key} className="relative flex items-baseline gap-3 text-md">
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -start-5 top-1.5 size-2.5 rounded-full ring-4 ring-background",
                    dot(l),
                  )}
                />
                <span className="min-w-0">
                  <span className="font-medium text-foreground">{who}</span>{" "}
                  <span className="text-muted-foreground">{what}</span>
                </span>
                <time
                  dateTime={l.at}
                  title={new Date(l.at).toLocaleString()}
                  className="ms-auto shrink-0 text-2xs tabular-nums text-muted-foreground"
                >
                  {formatRelative(l.at)}
                </time>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
