import { navigateWithAgentChatViewTransition } from "@agent-native/core/client/agent-chat";
import { useT } from "@agent-native/core/client/i18n";
import { focusAgentChat } from "@agent-native/toolkit/app/chat";
import { AgentSidebar } from "@agent-native/toolkit/app/chat";
import { useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";

import { chatThreadPath } from "@/lib/chat-paths";
import { TAB_ID } from "@/lib/tab-id";

const REPORT_PATH = /^\/reports\/([^/]+)$/;

interface AgentInspectorProps {
  children: ReactNode;
  chatHomeHandoffActive: boolean;
  chatHomeHandoffPending: boolean;
}

/** Contextual inspector shell used on secondary chat routes. */
export function AgentInspector({
  children,
  chatHomeHandoffActive,
  chatHomeHandoffPending,
}: AgentInspectorProps) {
  const navigate = useNavigate();
  const t = useT();
  const { pathname } = useLocation();
  // On phones the sidebar is a full-width sheet: never open it on first load.
  const [isPhone] = useState(
    () => typeof window !== "undefined" && !window.matchMedia("(min-width: 48rem)").matches,
  );
  const encodedReportId = pathname.match(REPORT_PATH)?.[1] ?? null;
  const scope = useMemo(() => {
    if (!encodedReportId) return null;
    let id = encodedReportId;
    try {
      id = decodeURIComponent(encodedReportId);
    } catch {
      // keep the raw segment
    }
    return { type: "repro-report", id, contextKey: "repro-report", label: "Report" };
  }, [encodedReportId]);

  function openAskAgentFullscreen(threadId?: string) {
    focusAgentChat();
    navigateWithAgentChatViewTransition(navigate, chatThreadPath(threadId));
  }

  return (
    <AgentSidebar
      position="right"
      chatViewTransition
      chatViewTransitionHandoff={chatHomeHandoffPending}
      {...(isPhone ? { defaultOpen: false } : {})}
      storageKey="chat"
      scope={scope}
      isolateHistoryByScope
      browserTabId={TAB_ID}
      openOnChatRunning={chatHomeHandoffActive}
      onFullscreenRequest={openAskAgentFullscreen}
      emptyStateText={
        scope ? t("report.agentEmpty") : t("chat.inspectEmptyState")
      }
      agentPageHref="/settings/agent"
      suggestions={
        scope
          ? [
              t("report.suggestMissing"),
              t("report.suggestDuplicates"),
              t("report.suggestConsole"),
            ]
          : [
              t("chat.inspectSuggestionCapabilities"),
              t("chat.inspectSuggestionHello"),
              t("chat.inspectSuggestionAction"),
            ]
      }
    >
      {children}
    </AgentSidebar>
  );
}
