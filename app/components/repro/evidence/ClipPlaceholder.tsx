import { useT } from "@agent-native/core/client/i18n";
import { IconArrowUpRight, IconPlayerPlay, IconVideoOff } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const frame =
  "relative flex aspect-video w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-border bg-muted/40 text-center";

/**
 * `loading`: a read is in flight or the agent is running. `idle`: nothing is
 * reading the clip yet, so it is static (no spinner). `unavailable`: failed.
 */
export function ClipPlaceholder({
  state,
  shareUrl,
}: {
  state: "loading" | "idle" | "unavailable";
  shareUrl: string;
}) {
  const t = useT();
  if (state === "loading") {
    return (
      <div className={frame} aria-busy="true">
        <Skeleton className="absolute inset-0 rounded-lg bg-transparent" />
        <IconPlayerPlay aria-hidden="true" className="relative size-5 text-muted-foreground/50" />
        <p className="relative text-2xs text-muted-foreground">{t("evidence.loadingRecording")}</p>
      </div>
    );
  }
  if (state === "idle") {
    return (
      <div className={frame}>
        <IconPlayerPlay aria-hidden="true" className="size-5 text-muted-foreground/50" />
        <p className="text-2xs text-muted-foreground">{t("evidence.notReadYet")}</p>
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
