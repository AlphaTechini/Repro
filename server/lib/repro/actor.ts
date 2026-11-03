import type { ActionRunContext } from "@agent-native/core/action";
import type { Actor } from "../../../shared/repro/types.js";

/** Only a call from the app UI is a human edit; agent loop, MCP, CLI, HTTP are "agent". */
export function actorFromCtx(ctx: ActionRunContext | undefined): Actor {
  return ctx?.caller === "frontend" ? "human" : "agent";
}
