import { buildSettingsRoute } from "@agent-native/core/client/navigation";
import { useT } from "@agent-native/core/client/i18n";
import { useCallback } from "react";
import { Link, useNavigate } from "react-router";

import { ClipLinkInline } from "../new-report/ClipLinkField";
import { useClipLink } from "../new-report/use-clip-link";
import { EmptyState } from "../ui";

export function InboxFirstRun({ githubConnected }: { githubConnected: boolean | undefined }) {
  const t = useT();
  const navigate = useNavigate();
  const onCreated = useCallback(
    ({ id }: { id: string }) => navigate(`/reports/${encodeURIComponent(id)}?new=1`),
    [navigate],
  );
  const link = useClipLink({ onCreated });
  const steps = [
    t("reports.firstRunStep1"),
    t("reports.firstRunStep2"),
    t("reports.firstRunStep3"),
  ];
  return (
    <EmptyState
      title={t("reports.firstRunTitle")}
      description={t("reports.firstRunDescription")}
    >
      <ol className="flex flex-col gap-2.5">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3 text-md">
            <span
              aria-hidden="true"
              className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border font-mono text-2xs tabular-nums text-muted-foreground"
            >
              {i + 1}
            </span>
            <span className="text-foreground">{step}</span>
          </li>
        ))}
      </ol>
      <ClipLinkInline link={link} autoFocus />
      {githubConnected === false ? (
        <p className="text-xs text-muted-foreground">
          {t("reports.firstRunGithubHint")}{" "}
          <Link
            to={buildSettingsRoute("app", "github")}
            className="text-foreground underline underline-offset-2"
          >
            {t("reports.firstRunGithubLink")}
          </Link>
        </p>
      ) : null}
    </EmptyState>
  );
}
