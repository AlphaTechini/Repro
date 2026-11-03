import {
  actionErrorMessage,
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useT } from "@agent-native/core/client/i18n";
import {
  SettingsGroup,
  SettingsRow,
} from "@agent-native/toolkit/app/settings";
import {
  IconArrowUpRight,
  IconBrandGithub,
  IconCircleCheck,
  IconCircleDashed,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  REQUIRABLE_FIELDS,
  type RequirableField,
  type ReproSettingsView,
} from "@shared/repro/types";

import { MissingMark, Notice } from "../ui";

const REQUIRED_LABEL: Record<RequirableField, string> = {
  title: "settings.fieldTitle",
  steps: "settings.fieldSteps",
  expected: "settings.fieldExpected",
  actual: "settings.fieldActual",
  frequency: "settings.fieldFrequency",
  severity: "settings.fieldSeverity",
  environment: "settings.fieldEnvironment",
  evidence: "settings.fieldEvidence",
};

const SETTINGS_KEY = ["action", "get-settings", {}] as const;

export const githubSearchEntries = [
  { id: "github-connect", label: "Connect GitHub", keywords: "github app install", hash: "github-connect" },
  { id: "github-repo", label: "Repository", keywords: "github repo issues", hash: "github-repo" },
  { id: "github-autofile", label: "Auto-file", keywords: "automatic file issue", hash: "github-autofile" },
  { id: "github-required", label: "Required fields", keywords: "completeness checklist", hash: "github-required" },
];

export function GithubSettingsArea() {
  const t = useT();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const settingsQuery = useActionQuery("get-settings", {});
  const settings = settingsQuery.data;
  const connected = settings?.githubInstallationId != null;
  const repos = useActionQuery("list-github-repos", {}, { enabled: connected, retry: false });
  const [connecting, setConnecting] = useState(false);
  const githubError = params.get("github_error");

  // Returning from /github/setup.
  const announced = useRef(false);
  useEffect(() => {
    if (announced.current) return;
    if (params.get("github") === "connected") {
      announced.current = true;
      toast.success(t("settings.connectedToast"));
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete("github");
          return p;
        },
        { replace: true },
      );
    }
  }, [params, setParams, t]);

  const update = useActionMutation("update-settings", {
    onMutate: async (vars: {
      githubRepo?: string;
      autoFile?: boolean;
      requiredFields?: RequirableField[];
    }) => {
      await qc.cancelQueries({ queryKey: SETTINGS_KEY });
      const prev = qc.getQueryData<ReproSettingsView>(SETTINGS_KEY);
      qc.setQueryData<ReproSettingsView>(SETTINGS_KEY, (old) =>
        old ? { ...old, ...vars } : old,
      );
      return { prev };
    },
    onError: (
      err: unknown,
      vars: { autoFile?: boolean; requiredFields?: RequirableField[]; githubRepo?: string },
      rawCtx: unknown,
    ) => {
      const ctx = rawCtx as { prev?: ReproSettingsView | undefined } | undefined;
      if (ctx?.prev) qc.setQueryData(SETTINGS_KEY, ctx.prev);
      toast.error(
        vars.autoFile !== undefined
          ? t("settings.autoFileFailed")
          : vars.githubRepo !== undefined
            ? t("settings.repoFailed")
            : t("settings.requiredFailed"),
        { description: actionErrorMessage(err) },
      );
    },
  });

  const requiredRow = settings ? (
    <SettingsRow
      id="github-required"
      label={t("settings.required")}
      description={t("settings.requiredBody")}
    >
      <div className="@container">
        <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
          {REQUIRABLE_FIELDS.map((f) => {
            const checked = settings.requiredFields.includes(f);
            const locked = f === "title";
            const box = (
              <span className="flex items-center gap-2">
                <Checkbox
                  id={`required-${f}`}
                  checked={checked}
                  disabled={locked}
                  onCheckedChange={(v) => {
                    const next = v === true
                      ? REQUIRABLE_FIELDS.filter((x) => x === f || settings.requiredFields.includes(x))
                      : settings.requiredFields.filter((x) => x !== f);
                    update.mutate({ requiredFields: [...next] });
                  }}
                />
                <Label htmlFor={`required-${f}`} className="text-md font-normal">
                  {t(REQUIRED_LABEL[f])}
                </Label>
              </span>
            );
            return locked ? (
              <Tooltip key={f}>
                <TooltipTrigger asChild>{box}</TooltipTrigger>
                <TooltipContent>{t("settings.titleLocked")}</TooltipContent>
              </Tooltip>
            ) : (
              <div key={f}>{box}</div>
            );
          })}
        </div>
      </div>
    </SettingsRow>
  ) : null;

  if (settingsQuery.isLoading || !settings) {
    return (
      <SettingsGroup title={t("settings.githubTab")}>
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </SettingsGroup>
    );
  }

  const notices = (
    <div className="flex flex-col gap-2">
      {githubError ? (
        <Notice tone="danger" title={t("settings.githubError")}>
          {t("settings.githubErrorBody", { code: githubError })}
        </Notice>
      ) : null}
      {settingsQuery.isError ? (
        <Notice tone="danger" title={t("settings.loadError")}>
          {actionErrorMessage(settingsQuery.error)}
        </Notice>
      ) : null}
    </div>
  );

  if (!connected) {
    const doneRequired = settings.requiredFields.length;
    return (
      <div className="flex flex-col gap-4">
        {notices}
        <SettingsGroup title={t("settings.githubTab")}>
          <SettingsRow
            id="github-connect"
            icon={<IconBrandGithub className="size-4" />}
            label={t("settings.connect")}
            description={
              settings.githubAppConfigured
                ? t("settings.connectBody")
                : undefined
            }
            control={
              settings.githubAppConfigured && settings.githubInstallUrl ? (
                <Button
                  size="sm"
                  disabled={connecting}
                  onClick={() => {
                    setConnecting(true);
                    window.location.assign(settings.githubInstallUrl as string);
                  }}
                >
                  {connecting ? <Spinner /> : null}
                  {connecting ? t("settings.opening") : t("settings.connect")}
                </Button>
              ) : undefined
            }
          >
            <div className="flex flex-col gap-3">
              {!settings.githubAppConfigured ? (
                <Notice tone="warning" title={t("settings.notConfigured")}>
                  {t("settings.setEnvPrefix")}{" "}
                  {["GITHUB_APP_ID", "GITHUB_APP_SLUG", "GITHUB_APP_PRIVATE_KEY"].map((v, i) => (
                    <span key={v}>
                      {i > 0 ? ", " : null}
                      <code className="rounded-sm bg-muted px-1 font-mono text-2xs">{v}</code>
                    </span>
                  ))}{" "}
                  {t("settings.setEnvSuffix")}{" "}
                  <code className="rounded-sm bg-muted px-1 font-mono text-2xs">docs/SETUP.md</code>.
                </Notice>
              ) : null}
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-muted-foreground">{t("settings.filingNeeds")}</p>
                <ul className="flex flex-col gap-1.5 text-md">
                  <li className="flex items-center gap-2">
                    <IconCircleDashed aria-hidden="true" className="size-3.5 text-status-draft" />
                    {t("settings.needInstall")}
                  </li>
                  <li className="flex items-center gap-2">
                    <IconCircleDashed aria-hidden="true" className="size-3.5 text-status-draft" />
                    {t("settings.needRepo")}
                  </li>
                  <li className="flex items-center gap-2">
                    <IconCircleCheck aria-hidden="true" className="size-3.5 text-status-ready" />
                    {t("settings.requiredSet", { count: doneRequired })}
                  </li>
                </ul>
              </div>
            </div>
          </SettingsRow>
          {requiredRow}
        </SettingsGroup>
      </div>
    );
  }

  const account = settings.githubAccount ?? "GitHub";
  const repoList = repos.data?.repos ?? [];
  const repoValue = settings.githubRepo ?? "";
  return (
    <div className="flex flex-col gap-4">
      {notices}
      <SettingsGroup title={t("settings.githubTab")}>
        <SettingsRow
          id="github-connect"
          icon={
            <Avatar className="size-5">
              <AvatarFallback className="text-2xs">
                {account.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          }
          label={account}
          status={
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-status-ready" />
              {t("settings.connectedStatus")}
            </span>
          }
          control={
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://github.com/settings/installations/${settings.githubInstallationId}`}
                target="_blank"
                rel="noreferrer"
              >
                {t("settings.manage")}
                <IconArrowUpRight aria-hidden="true" />
              </a>
            </Button>
          }
        />
        <SettingsRow
          id="github-repo"
          label={t("settings.repository")}
          description={
            repos.isSuccess && repoList.length === 0
              ? t("settings.noRepos")
              : t("settings.repositoryBody")
          }
          status={settings.githubRepo ? undefined : <MissingMark label={t("settings.chooseRepo")} />}
          control={
            repos.isError ? (
              <span className="inline-flex items-center gap-2 text-xs text-error-ink">
                {t("settings.reposError")}
                <Button variant="link" size="xs" className="h-auto p-0" onClick={() => repos.refetch()}>
                  {t("reports.retry")}
                </Button>
              </span>
            ) : (
              <Select
                value={repoValue}
                disabled={repos.isLoading}
                onValueChange={(v) => update.mutate({ githubRepo: v })}
              >
                <SelectTrigger className="h-8 w-64" aria-label={t("settings.repository")}>
                  {repos.isLoading ? (
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Spinner /> {t("settings.loadingRepos")}
                    </span>
                  ) : (
                    <SelectValue placeholder={t("settings.chooseRepo")} />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {settings.githubRepo && !repoList.some((r) => r.fullName === settings.githubRepo) ? (
                    <SelectItem value={settings.githubRepo} className="font-mono text-xs">
                      {settings.githubRepo}
                    </SelectItem>
                  ) : null}
                  {repoList.map((r) => (
                    <SelectItem key={r.fullName} value={r.fullName} className="font-mono text-xs">
                      {r.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          }
        />
        <SettingsRow
          id="github-autofile"
          label={t("settings.autoFile")}
          description={t("settings.autoFileBody")}
          control={
            <Switch
              checked={settings.autoFile}
              aria-label={t("settings.autoFile")}
              onCheckedChange={(v) => update.mutate({ autoFile: v })}
            />
          }
        />
        {requiredRow}
      </SettingsGroup>
    </div>
  );
}
