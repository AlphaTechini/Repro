import { useT } from "@agent-native/core/client/i18n";
import { forwardRef, useMemo } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Report } from "@shared/repro/types";

import { ClipPlayer } from "./ClipPlayer";
import { ConsoleList } from "./ConsoleList";
import { EvidenceTimeline, type TimelineTick } from "./EvidenceTimeline";
import { NetworkList } from "./NetworkList";
import { TranscriptList } from "./TranscriptList";
import type { SeekTarget } from "./seek";

function Count({ n }: { n: number }) {
  return <span className="text-2xs tabular-nums text-muted-foreground">{n}</span>;
}

export const EvidencePanel = forwardRef<
  HTMLDivElement,
  {
    report: Report;
    seek: SeekTarget;
    onSeek: (atMs: number) => void;
  }
>(function EvidencePanel({ report, seek, onSeek }, playerRef) {
  const t = useT();
  const evidence = report.evidence;

  const cited = useMemo(() => {
    const consoleIds = new Set<string>();
    const networkIds = new Set<string>();
    const segments = new Set<number>();
    const transcript = evidence?.transcript ?? [];
    for (const src of Object.values(report.fieldSources)) {
      const s = src?.source;
      if (!s || src.actor !== "agent") continue;
      if (s.kind === "console" && s.ref) consoleIds.add(s.ref);
      if (s.kind === "network" && s.ref) networkIds.add(s.ref);
      if (s.kind === "transcript" && s.atMs != null) {
        const at = s.atMs;
        const idx = transcript.findIndex((g) => at >= g.startMs && at <= g.endMs);
        if (idx >= 0) segments.add(idx);
      }
    }
    return { consoleIds, networkIds, segments };
  }, [report.fieldSources, evidence?.transcript]);

  const ticks = useMemo<TimelineTick[]>(() => {
    if (!evidence) return [];
    const out: TimelineTick[] = [];
    for (const c of evidence.consoleIssues) {
      if (c.atMs != null && c.atMs >= 0 && (c.level === "error" || c.level === "warn")) {
        out.push({
          atMs: c.atMs,
          kind: c.level === "error" ? "error" : "warn",
          label: `Console ${c.level}`,
        });
      }
    }
    for (const r of evidence.failedRequests) {
      if (r.atMs != null && r.atMs >= 0) {
        out.push({ atMs: r.atMs, kind: "warn", label: "Failed request" });
      }
    }
    for (const src of Object.values(report.fieldSources)) {
      if (src?.actor === "agent" && src.source?.kind === "transcript" && src.source.atMs != null) {
        out.push({ atMs: src.source.atMs, kind: "cited", label: "Cited moment" });
      }
    }
    return out;
  }, [evidence, report.fieldSources]);

  const activeSegment = useMemo(() => {
    const transcript = evidence?.transcript ?? [];
    if (seek.nonce === 0) return null;
    const i = transcript.findIndex(
      (g) => seek.atMs >= g.startMs && seek.atMs < g.endMs,
    );
    return i >= 0 ? i : null;
  }, [evidence?.transcript, seek]);

  const consoleIssues = evidence?.consoleIssues ?? [];
  const failedRequests = evidence?.failedRequests ?? [];
  const transcript = evidence?.transcript ?? [];
  const hasDiagnostics = evidence?.hasDiagnostics ?? false;

  return (
    <div className="flex flex-col gap-4">
      <ClipPlayer
        ref={playerRef}
        reportId={report.id}
        recordingId={report.recordingId}
        origin={report.clipOrigin}
        shareUrl={report.clipUrl}
        seek={seek}
        durationMs={evidence?.durationMs}
        frames={evidence?.frames ?? []}
        onSeek={onSeek}
      />
      {evidence?.durationMs ? (
        <EvidenceTimeline
          durationMs={evidence.durationMs}
          ticks={ticks}
          onSeek={onSeek}
        />
      ) : null}
      {evidence ? (
        <Tabs
          defaultValue={consoleIssues.length ? "console" : "transcript"}
          key={report.id}
        >
          <TabsList className="h-8 w-full">
            <TabsTrigger value="console" className="h-6 flex-1 gap-1.5 text-md">
              {t("evidence.console")}
              <Count n={consoleIssues.length} />
            </TabsTrigger>
            <TabsTrigger value="network" className="h-6 flex-1 gap-1.5 text-md">
              {t("evidence.network")}
              <Count n={failedRequests.length} />
            </TabsTrigger>
            <TabsTrigger value="transcript" className="h-6 flex-1 gap-1.5 text-md">
              {t("evidence.transcript")}
              <Count n={transcript.length} />
            </TabsTrigger>
          </TabsList>
          <TabsContent value="console" className="mt-3">
            <ConsoleList
              issues={consoleIssues}
              citedIds={cited.consoleIds}
              onSeek={onSeek}
              hasDiagnostics={hasDiagnostics}
            />
          </TabsContent>
          <TabsContent value="network" className="mt-3">
            <NetworkList
              requests={failedRequests}
              citedIds={cited.networkIds}
              onSeek={onSeek}
              hasDiagnostics={hasDiagnostics}
            />
          </TabsContent>
          <TabsContent value="transcript" className="mt-3">
            <TranscriptList
              segments={transcript}
              status={evidence.transcriptStatus}
              citedIndexes={cited.segments}
              activeIndex={activeSegment}
              onSeek={onSeek}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <p className="text-md text-muted-foreground">{t("evidence.notRead")}</p>
      )}
    </div>
  );
});
