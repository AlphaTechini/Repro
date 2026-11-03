import { useT } from "@agent-native/core/client/i18n";
import type { ReactNode } from "react";

export type AgentPhase = "reading" | "filling" | "asking" | "filing";

export function AgentActivityLine({
  phase,
  detail,
  action,
}: {
  phase: AgentPhase | null;
  detail?: string | undefined;
  action?: ReactNode;
}) {
  const t = useT();
  if (!phase) return null;
  const text =
    detail ??
    {
      reading: t("agent.reading"),
      filling: t("agent.filling"),
      asking: t("agent.asking"),
      filing: t("agent.filing"),
    }[phase];
  return (
    <div
      role="status"
      className="flex h-6 items-center gap-2 text-md text-muted-foreground"
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 animate-repro-breathe rounded-full bg-source-agent"
      />
      <span className="truncate">{text}</span>
      {action}
    </div>
  );
}
