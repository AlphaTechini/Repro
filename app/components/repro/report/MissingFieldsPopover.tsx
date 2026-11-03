import { useT } from "@agent-native/core/client/i18n";
import { IconCheck } from "@tabler/icons-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { RequirableField } from "@shared/repro/types";

import { FIELD_LABEL } from "../lib/fields";
import { CompletenessMeter } from "../ui";

export function MissingFieldsPopover({
  percent,
  missing,
  onPick,
}: {
  percent: number;
  missing: RequirableField[];
  onPick: (field: RequirableField) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("report.completenessDetails")}
          className="hidden rounded-md px-1.5 py-1 hover:bg-accent @md/header:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="hidden @3xl/header:inline-flex">
            <CompletenessMeter percent={percent} missingCount={missing.length} size="md" />
          </span>
          <span className="hidden @md/header:inline-flex @3xl/header:hidden">
            <CompletenessMeter percent={percent} missingCount={missing.length} size="md" barOnly />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1">
        {missing.length === 0 ? (
          <p className="flex items-center gap-2 px-2 py-1.5 text-md">
            <IconCheck aria-hidden="true" className="size-4 text-status-ready" />
            {t("report.allFilled")}
          </p>
        ) : (
          <>
            <p className="px-2 py-1.5 text-2xs font-medium text-muted-foreground">
              {t("report.missingCount", { count: missing.length })}
            </p>
            {missing.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onPick(f);
                }}
                className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span aria-hidden="true" className="size-1.5 rounded-full bg-status-needs-info" />
                {FIELD_LABEL[f]}
              </button>
            ))}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
