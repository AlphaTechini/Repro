import {
  actionErrorMessage,
  useActionMutation,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type {
  Report,
  ReportField,
  ReproSettingsView,
} from "@shared/repro/types";

import { FIELD_LABEL, parseClipTimeInput } from "./fields";

export type FieldValue = string | string[] | null;

export interface FieldChange {
  field: ReportField;
  value: FieldValue;
}

export function reportKey(id: string) {
  return ["action", "get-report", { id }] as const;
}

export function useReport(id: string) {
  return useActionQuery("get-report", { id }, { retry: false });
}

export function useReportEvents(id: string) {
  return useActionQuery("list-report-events", { id });
}

export function useReproSettings() {
  return useActionQuery("get-settings", {});
}

/** Applies a change to a cached report the way the server will. */
function applyChanges(report: Report, changes: FieldChange[]): Report {
  const next: Report = {
    ...report,
    fieldSources: { ...report.fieldSources },
  };
  const at = new Date().toISOString();
  for (const c of changes) {
    switch (c.field) {
      case "steps":
        next.steps = Array.isArray(c.value) ? c.value : [];
        break;
      case "title":
      case "summary":
      case "expected":
      case "actual":
      case "environment":
        next[c.field] = typeof c.value === "string" ? c.value : null;
        break;
      case "breaksAt": {
        const ms = typeof c.value === "string" ? parseClipTimeInput(c.value) : null;
        next.breaksAtMs = ms;
        break;
      }
      case "frequency":
        next.frequency = (c.value as Report["frequency"]) ?? null;
        break;
      case "severity":
        next.severity = (c.value as Report["severity"]) ?? null;
        break;
    }
    next.fieldSources[c.field] = { actor: "human", at };
  }
  return next;
}

/** Optimistic field saves: the cache changes now, rolls back on failure. */
export function useSaveFields(id: string) {
  const qc = useQueryClient();
  const mutation = useActionMutation("update-report-fields", {
    onMutate: async (vars: { id: string; changes: FieldChange[] }) => {
      await qc.cancelQueries({ queryKey: reportKey(id) });
      const prev = qc.getQueryData<{ report: Report }>(reportKey(id));
      qc.setQueryData<{ report: Report }>(reportKey(id), (old) =>
        old ? { ...old, report: applyChanges(old.report, vars.changes) } : old,
      );
      return { prev };
    },
    onError: (
      err: unknown,
      vars: { id: string; changes: FieldChange[] },
      rawCtx: unknown,
    ) => {
      const ctx = rawCtx as { prev?: { report: Report } | undefined } | undefined;
      if (ctx?.prev) qc.setQueryData(reportKey(id), ctx.prev);
      const field = vars.changes[0]?.field;
      const label = field ? FIELD_LABEL[field as keyof typeof FIELD_LABEL] ?? field : "field";
      toast.error(
        `Couldn't save ${label}. Your change was undone.`,
        { description: actionErrorMessage(err) },
      );
    },
  });
  return (changes: FieldChange[]) => mutation.mutate({ id, changes });
}

export type SettingsView = ReproSettingsView;
