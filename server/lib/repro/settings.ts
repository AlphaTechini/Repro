import { getOrgSetting, getUserSetting, putOrgSetting, putUserSetting } from "@agent-native/core/settings";
import { z } from "zod";
import {
  DEFAULT_REQUIRED_FIELDS,
  REQUIRABLE_FIELDS,
  type ReproSettings,
} from "../../../shared/repro/types.js";
import type { Scope } from "./scope.js";

const KEY = "repro";

const schema = z.object({
  githubInstallationId: z.number().int().nullable().catch(null),
  githubAccount: z.string().nullable().catch(null),
  githubRepo: z.string().nullable().catch(null),
  autoFile: z.boolean().catch(true),
  requiredFields: z
    .array(z.enum(REQUIRABLE_FIELDS as [string, ...string[]]))
    .catch([...DEFAULT_REQUIRED_FIELDS]),
});

function decode(raw: Record<string, unknown> | null): ReproSettings {
  const parsed = schema.parse({
    githubInstallationId: null,
    githubAccount: null,
    githubRepo: null,
    autoFile: true,
    requiredFields: [...DEFAULT_REQUIRED_FIELDS],
    ...(raw ?? {}),
  });
  return parsed as ReproSettings;
}

export async function readReproSettings(scope: Scope): Promise<ReproSettings> {
  const raw = scope.orgId
    ? await getOrgSetting(scope.orgId, KEY)
    : await getUserSetting(scope.userEmail, KEY);
  return decode(raw);
}

export async function writeReproSettings(
  scope: Scope,
  patch: Partial<ReproSettings>,
): Promise<ReproSettings> {
  const current = await readReproSettings(scope);
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  const next = decode({ ...current, ...defined });
  if (scope.orgId) await putOrgSetting(scope.orgId, KEY, next as unknown as Record<string, unknown>);
  else await putUserSetting(scope.userEmail, KEY, next as unknown as Record<string, unknown>);
  return next;
}
