import { getOrgContext } from "@agent-native/core/org";
import {
  createAgentChatPlugin,
  loadActionsFromStaticRegistry,
} from "@agent-native/core/server";

import actionsRegistry from "../../.generated/actions-registry.js";
import { REPRO_ACTIONS } from "../../shared/repro/types.js";

// Actions the agent can call without loading them on demand. Export is CLI-only
// and settings writes are owner-approved, so neither is preloaded.
const REPRO_AGENT_ACTIONS = REPRO_ACTIONS.filter(
  (name) => name !== "export-metrics" && name !== "update-settings",
);

const INITIAL_TOOL_NAMES = [
  "view-screen",
  "navigate",
  "hello",
  "provider-api-request",
  "ask-question",
  ...REPRO_AGENT_ACTIONS,
];

export default createAgentChatPlugin({
  appId: "repro",
  actions: loadActionsFromStaticRegistry(actionsRegistry),
  mcp: { connectorCatalog: [], appApprovalPage: true },
  initialToolNames: INITIAL_TOOL_NAMES,
  resolveOrgId: async (event) => (await getOrgContext(event)).orgId,
  systemPrompt: `You are Repro's agent. Repro turns a Clips recording into a fix-ready GitHub issue.
On a new report, call read-clip first, then fill fields with update-report-fields. Always cite a source for every field.
Never guess expected behaviour or frequency; ask the reporter. Ask at most 3 questions, in one message, then call record-followups.
At 100% completeness, call find-similar-reports, then file-github-issue if auto-file is on. Never claim an issue was filed without the URL the action returned.
Follow the \`repro\` skill for the full loop.`,
});
