import { useT } from "@agent-native/core/client/i18n";
import { IconArrowUpRight, IconPlayerPlay, IconVideoOff } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const frame =
  "relative flex aspect-video w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-border bg-muted/40 text-center";

export function ClipPlaceholder({
  state,
  shareUrl,
}: {
  state: "pending" | "unavailable";
  shareUrl: string;
}) {
  const t = useT();
  if (state === "pending") {
    return (
      <div className={frame} aria-busy="true">
        <Skeleton className="absolute inset-0 rounded-lg bg-transparent" />
        <IconPlayerPlay aria-hidden="true" className="relative size-5 text-muted-foreground/50" />
        <p className="relative text-2xs text-muted-foreground">{t("evidence.loadingRecording")}</p>
      </div>
    );
  }
  return (
    <div className={frame}>
      <IconVideoOff aria-hidden="true" className="size-5 text-muted-foreground/60" />
      <p className="text-md text-foreground">{t("evidence.cantPlay")}</p>
      <Button variant="outline" size="xs" asChild>
        <a href={shareUrl} target="_blank" rel="noreferrer">
          {t("evidence.openInClips")}
          <IconArrowUpRight aria-hidden="true" />
        </a>
      </Button>
    </div>
  );
}
