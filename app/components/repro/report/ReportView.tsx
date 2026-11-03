import {
  actionErrorCode,
  actionErrorMessage,
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useT } from "@agent-native/core/client/i18n";
import {
  requestAgentChatThreadOpen,
  sendToAgentChat,
  useAgentChatGenerating,
} from "@agent-native/core/client/agent-chat";
import { useSetHeaderActions, useSetPageTitle } from "@agent-native/toolkit/app-shell";
import { focusAgentChat } from "@agent-native/toolkit/app/chat";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { computeCompleteness } from "@shared/repro/lib/completeness";
import {
  DEFAULT_REQUIRED_FIELDS,
  type Report,
  type RequirableField,
} from "@shared/repro/types";

import { EvidencePanel } from "../evidence/EvidencePanel";
import { prefersReducedMotion, type SeekTarget } from "../evidence/seek";
import {
  FIELD_LABEL,
  fieldDomId,
  isReadOnlyStatus,
  latestAgentFlashKeys,
} from "../lib/fields";
import {
  useReport,
  useReportEvents,
  useReproSettings,
  useSaveFields,
} from "../lib/use-report-data";
import { EmptyState, Notice } from "../ui";
import { ActivityTimeline } from "./ActivityTimeline";
import { AgentActivityLine, type AgentPhase } from "./AgentActivityLine";
import { ReportForm } from "./ReportForm";
import { ReportHeaderActions } from "./ReportHeaderActions";
import { ReportHeaderTitle } from "./ReportHeaderTitle";
import { ReportSkeleton } from "./ReportSkeleton";

const STALL_MS = 20_000;
const FRESH_MS = 5_000;

function defaultSeekMs(report: Report): number {
  const ev = report.evidence;
  if (!ev) return 0;
  const err = ev.consoleIssues.find((c) => c.level === "error" && c.atMs != null && c.atMs >= 0);
  if (err?.atMs != null) return err.atMs;
  const req = ev.failedRequests.find((r) => r.atMs != null && r.atMs >= 0);
  return req?.atMs ?? 0;
}

export function ReportView({ id }: { id: string }) {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const reportQuery = useReport(id);
  const eventsQuery = useReportEvents(id);
  const settingsQuery = useReproSettings();
  const report = reportQuery.data?.report;
  const events = eventsQuery.data?.events;
  const settings = settingsQuery.data;
  const save = useSaveFields(id);

  const requiredFields: readonly RequirableField[] =
    settings?.requiredFields ?? DEFAULT_REQUIRED_FIELDS;
  const computed = useMemo(
    () => (report ? computeCompleteness(report, requiredFields) : null),
    [report, requiredFields],
  );

  // --- kick off the agent exactly once for a freshly created report -------
  const kicked = useRef(false);
  useEffect(() => {
    if (!report || kicked.current) return;
    kicked.current = true;
    const threadId = report.agentThreadId ?? `repro-${id}`;
    if (params.get("new") === "1") {
      const marker = `repro:kickoff:${id}`;
      let already = false;
      try {
        already = sessionStorage.getItem(marker) === "1";
        sessionStorage.setItem(marker, "1");
      } catch {
        // storage blocked: the URL flag below still prevents a re-send on reload
      }
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete("new");
          return p;
        },
        { replace: true },
      );
      if (!already && !report.clipReadAt) {
        sendToAgentChat({
          message: t("report.agentKickoff"),
          context: JSON.stringify({ reportId: id }),
          submit: true,
          openSidebar: true,
          newTab: true,
          tabId: threadId,
        });
      }
    } else if (report.agentThreadId) {
      requestAgentChatThreadOpen({ threadId: report.agentThreadId });
    }
  }, [report, id, params, setParams, t]);

  // --- agent state ---------------------------------------------------------
  const [generating] = useAgentChatGenerating({ tabId: report?.agentThreadId ?? null });
  const [stalled, setStalled] = useState(false);
  const createdAt = report ? new Date(report.createdAt).getTime() : 0;
  const clipRead = !!report?.clipReadAt;
  useEffect(() => {
    if (!report || clipRead || generating) {
      setStalled(false);
      return;
    }
    const wait = Math.max(0, STALL_MS - (Date.now() - createdAt));
    const timer = window.setTimeout(() => setStalled(true), wait);
    return () => window.clearTimeout(timer);
  }, [report, clipRead, generating, createdAt]);

  const readClip = useActionMutation("read-clip");
  const [readError, setReadError] = useState<string | null>(null);
  function retryRead() {
    setReadError(null);
    setStalled(false);
    readClip.mutate(
      { id },
      { onError: (err: unknown) => setReadError(actionErrorMessage(err) ?? "") },
    );
  }
  const readFailed = !clipRead && (readError != null || stalled) && !readClip.isPending;
  const reading = !clipRead && !readFailed;
  const readingEnded = !reading;

  // --- filing --------------------------------------------------------------
  const fileIssue = useActionMutation("file-github-issue");
  const [filing, setFiling] = useState(false);
  const [filedNow, setFiledNow] = useState<{ number: number; url: string } | null>(null);
  const [fileError, setFileError] = useState<{ message: string; code: string } | null>(null);
  function onFile() {
    setFiling(true);
    setFileError(null);
    fileIssue.mutate(
      { id },
      {
        onSuccess: (r: { number: number; url: string }) => {
          setFiling(false);
          setFiledNow({ number: r.number, url: r.url });
        },
        onError: (err: unknown) => {
          setFiling(false);
          setFileError({
            message: actionErrorMessage(err) ?? "",
            code: String(actionErrorCode(err) ?? ""),
          });
          if (actionErrorCode(err) === "github_not_connected") settingsQuery.refetch();
        },
      },
    );
  }

  // --- duplicate suggestion ------------------------------------------------
  const dismissKey = `repro:dup-dismissed:${id}`;
  const [dupDismissed, setDupDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(dismissKey) === "1";
    } catch {
      return false;
    }
  });
  const duplicateEligible =
    !!report &&
    clipRead &&
    !!report.title?.trim() &&
    (report.status === "draft" || report.status === "needs-info" || report.status === "ready");
  const similar = useActionQuery("find-similar-reports", { id }, { enabled: duplicateEligible, retry: false });
  const markDuplicate = useActionMutation("mark-duplicate");
  const topCandidate = similar.data?.likelyDuplicate ? similar.data.candidates[0] : undefined;

  const original = useActionQuery(
    "get-report",
    { id: report?.duplicateOfId ?? "" },
    { enabled: !!report?.duplicateOfId && report.status === "duplicate", retry: false },
  );

  // --- seek ----------------------------------------------------------------
  const playerRef = useRef<HTMLDivElement>(null);
  const [seek, setSeek] = useState<SeekTarget>({ atMs: 0, nonce: 0 });
  useEffect(() => {
    if (report && seek.nonce === 0) {
      const ms = defaultSeekMs(report);
      if (ms !== seek.atMs) setSeek({ atMs: ms, nonce: 0 });
    }
  }, [report, seek]);
  function onSeek(atMs: number) {
    setSeek((s) => ({ atMs, nonce: s.nonce + 1 }));
    playerRef.current?.scrollIntoView({
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  function onPickMissing(field: RequirableField) {
    if (field === "evidence") {
      playerRef.current?.scrollIntoView({
        block: "center",
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
      return;
    }
    const el = document.getElementById(fieldDomId(field));
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    const target = el.matches("input,textarea,button") ? el : el.querySelector<HTMLElement>("button,input");
    target?.focus({ preventScroll: true });
  }

  // --- flash / announcements -----------------------------------------------
  const flashKeys = useMemo(() => latestAgentFlashKeys(events), [events]);
  const freshFields = useMemo(() => {
    const set = new Set<string>();
    const now = Date.now();
    for (const e of events ?? []) {
      if (e.actor === "agent" && e.kind === "field_set" && e.field && now - new Date(e.at).getTime() < FRESH_MS) {
        set.add(e.field);
      }
    }
    return set;
  }, [events]);

  const [announcement, setAnnouncement] = useState("");
  const prevKeys = useRef<typeof flashKeys>(undefined);
  const queued = useRef<Set<string>>(new Set());
  useEffect(() => {
    const before = prevKeys.current;
    prevKeys.current = flashKeys;
    if (!flashKeys || !before) return;
    for (const [f, k] of Object.entries(flashKeys)) {
      if (before[f] !== k) queued.current.add(f);
    }
    if (queued.current.size === 0) return;
    const timer = window.setTimeout(() => {
      const names = Array.from(queued.current).map((f) => (FIELD_LABEL as Record<string, string>)[f] ?? f.charAt(0).toUpperCase() + f.slice(1));
      queued.current.clear();
      setAnnouncement(t("report.agentFilled", { fields: names.join(", ") }));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [flashKeys, t]);

  // --- header --------------------------------------------------------------
  const percent = computed?.percent ?? report?.completeness ?? 0;
  const missing = computed?.missing ?? report?.missingFields ?? [];
  useSetPageTitle(<ReportHeaderTitle report={report} />);
  useSetHeaderActions(
    report ? (
      <ReportHeaderActions
        report={report}
        percent={percent}
        missing={missing}
        onPickMissing={onPickMissing}
        fileProps={{
          githubConnected: settings ? settings.githubInstallationId != null : undefined,
          repoChosen: settings ? settings.githubRepo != null : undefined,
          filing,
          filedNow,
          onFile,
        }}
      />
    ) : null,
  );

  if (reportQuery.isError) {
    return (
      <div className="@container min-h-full">
        <EmptyState title={t("report.notFound")} description={t("report.notFoundBody")}>
          <div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/reports">{t("report.back")}</Link>
            </Button>
          </div>
        </EmptyState>
      </div>
    );
  }
  if (!report) return <ReportSkeleton />;

  const readOnly = isReadOnlyStatus(report.status);
  const issueNumber = report.githubIssueNumber ?? filedNow?.number ?? null;
  const issueUrl = report.githubIssueUrl ?? filedNow?.url ?? null;

  // --- notices -------------------------------------------------------------
  const notices: React.ReactNode[] = [];
  if (readFailed) {
    notices.push(
      <Notice
        key="read"
        tone="danger"
        title={t("report.readFailed")}
        actions={
          <>
            <Button size="xs" variant="outline" onClick={retryRead}>
              {t("reports.retry")}
            </Button>
            <Button size="xs" variant="ghost" asChild>
              <a href={report.clipUrl} target="_blank" rel="noreferrer">
                {t("evidence.openInClips")}
              </a>
            </Button>
          </>
        }
      >
        {readError ?? t("report.readStalled")}
      </Notice>,
    );
  }
  if (topCandidate && !dupDismissed && !readOnly) {
    const num = topCandidate.kind === "issue" ? topCandidate.number : topCandidate.githubIssueNumber;
    const title = topCandidate.title;
    notices.push(
      <Notice
        key="dup"
        tone="warning"
        title={num != null ? t("report.possibleDuplicateN", { n: num }) : t("report.possibleDuplicate")}
        actions={
          <>
            <Button
              size="xs"
              variant="outline"
              disabled={markDuplicate.isPending}
              onClick={() =>
                markDuplicate.mutate(
                  topCandidate.kind === "issue"
                    ? { id, duplicateOfIssueNumber: topCandidate.number }
                    : { id, duplicateOfId: topCandidate.id },
                )
              }
            >
              {markDuplicate.isPending ? <Spinner /> : null}
              {t("report.addToExisting")}
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setDupDismissed(true);
                try {
                  sessionStorage.setItem(dismissKey, "1");
                } catch {
                  // dismissal just won't persist across reloads
                }
              }}
            >
              {t("report.fileAsNew")}
            </Button>
          </>
        }
      >
        {title ? <>“{title}” · </> : null}
        {topCandidate.reason}
      </Notice>,
    );
  }
  if (fileError) {
    notices.push(
      <Notice
        key="file"
        tone="danger"
        title={t("report.fileFailed")}
        actions={
          fileError.code === "incomplete" ? undefined : (
            <Button size="xs" variant="outline" onClick={onFile}>
              {t("reports.retry")}
            </Button>
          )
        }
      >
        {fileError.message}
      </Notice>,
    );
  }
  if (report.status === "filed" && issueNumber != null) {
    notices.push(
      <Notice
        key="filed"
        title={t("report.filedNotice", { n: issueNumber })}
        actions={
          issueUrl ? (
            <Button size="xs" variant="outline" asChild>
              <a href={issueUrl} target="_blank" rel="noreferrer">
                {t("report.viewOnGithub")}
              </a>
            </Button>
          ) : undefined
        }
      />,
    );
  }
  if (report.status === "duplicate") {
    const origTitle = original.data?.report.title;
    notices.push(
      <Notice
        key="merged"
        actions={
          report.duplicateOfId ? (
            <Button size="xs" variant="outline" asChild>
              <Link to={`/reports/${encodeURIComponent(report.duplicateOfId)}`}>
                {t("report.openOriginal")}
              </Link>
            </Button>
          ) : undefined
        }
      >
        {origTitle
          ? t("report.mergedInto", { title: origTitle })
          : t("report.mergedGeneric")}
      </Notice>,
    );
  }

  // --- agent line ----------------------------------------------------------
  const lastEvent = events && events.length > 0
    ? [...events].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0]
    : undefined;
  let phase: AgentPhase | null = null;
  if (filing) phase = "filing";
  else if (reading || readClip.isPending) phase = "reading";
  else if (generating && !readOnly) phase = "filling";
  else if (!readOnly && report.status === "needs-info" && lastEvent?.kind === "followup_asked") phase = "asking";

  return (
    <div className="@container min-h-full">
      <div className="mx-auto grid w-full max-w-[76rem] grid-cols-1 gap-x-8 gap-y-10 px-4 pb-16 pt-6 @3xl:grid-cols-[minmax(0,1fr)_17.5rem] @3xl:px-8 @5xl:grid-cols-[minmax(0,1fr)_20rem] @5xl:gap-x-12 @6xl:grid-cols-[minmax(0,1fr)_24rem]">
        <ReportForm
          report={report}
          requiredFields={requiredFields}
          flashKeys={flashKeys}
          freshFields={freshFields}
          readingEnded={readingEnded}
          readOnly={readOnly}
          notices={
            notices.length > 0 ? <div className="flex flex-col gap-2">{notices}</div> : null
          }
          activityLine={
            <AgentActivityLine
              phase={phase}
              action={
                phase === "asking" ? (
                  <Button variant="link" size="xs" className="h-auto p-0" onClick={() => focusAgentChat()}>
                    {t("report.openChat")}
                  </Button>
                ) : undefined
              }
            />
          }
          activity={<ActivityTimeline events={events ?? []} issueNumber={issueNumber} />}
          onSave={save}
          onSeek={onSeek}
        />
        <aside
          aria-label={t("report.evidence")}
          className="min-w-0 @3xl:sticky @3xl:top-6 @3xl:max-h-[calc(100dvh-6rem)] @3xl:self-start @3xl:overflow-y-auto"
        >
          <EvidencePanel ref={playerRef} report={report} seek={seek} onSeek={onSeek} />
        </aside>
      </div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
