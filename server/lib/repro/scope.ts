import type { ActionRunContext } from "@agent-native/core/action";
import { fail } from "@agent-native/core/action";
import { getOrgContext } from "@agent-native/core/org";
import { getSession } from "@agent-native/core/server";
import type { H3Event } from "h3";

export interface Scope {
  /** Value stored in org_id columns: the org id, or `user:<email>` for personal workspaces. */
  orgKey: string;
  orgId: string | null;
  userEmail: string;
}

export function scopeFrom(orgId: string | null | undefined, userEmail: string): Scope {
  return { orgKey: orgId ?? `user:${userEmail}`, orgId: orgId ?? null, userEmail };
}

export function requireScope(ctx: ActionRunContext | undefined): Scope {
  const email = ctx?.userEmail;
  if (!email) {
    return fail("You need to be signed in.", { errorCode: "unauthorized", statusCode: 401 });
  }
  return scopeFrom(ctx?.orgId ?? null, email);
}

/** For server routes (no action context). Null when not signed in. */
export async function scopeFromSession(event: H3Event): Promise<Scope | null> {
  const session = await getSession(event);
  if (!session?.email) return null;
  const org = await getOrgContext(event).catch(() => null);
  return scopeFrom(org?.orgId ?? session.orgId ?? null, session.email);
}
