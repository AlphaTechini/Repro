import { useT } from "@agent-native/core/client/i18n";
import {
  actionErrorCode,
  actionErrorMessage,
  useActionMutation,
} from "@agent-native/core/client/hooks";
import { useCallback, useState } from "react";

import { parseClipLink } from "../lib/clip-link";

export type ClipLinkProblem = "shape" | "private" | "network";

export interface CreatedReport {
  id: string;
  agentThreadId: string | null;
}

function classifyError(err: unknown): ClipLinkProblem {
  const code = String(actionErrorCode(err) ?? "").toLowerCase();
  const message = (actionErrorMessage(err) ?? "").toLowerCase();
  if (code.includes("invalid") || code.includes("url")) return "shape";
  if (
    code.includes("private") ||
    code.includes("not_found") ||
    code.includes("forbidden") ||
    /private|not found|doesn't exist|does not exist|404|403|401/.test(message)
  ) {
    return "private";
  }
  return "network";
}

/** Paste, validate, create. Shared by the first-run field and the dialog. */
export function useClipLink({
  onCreated,
}: {
  onCreated: (report: CreatedReport) => void;
}) {
  const t = useT();
  const [value, setValueState] = useState("");
  const [problem, setProblem] = useState<ClipLinkProblem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const parsed = parseClipLink(value);
  const create = useActionMutation("create-report");

  const submit = useCallback(
    (raw: string) => {
      const link = parseClipLink(raw);
      if (!link.ok) {
        setProblem("shape");
        return;
      }
      setProblem(null);
      setSubmitting(true);
      create.mutate(
        { clipUrl: link.url },
        {
          onSuccess: (result: {
            id: string;
            agentThreadId?: string | null;
          }) => {
            onCreated({
              id: result.id,
              agentThreadId: result.agentThreadId ?? null,
            });
            setSubmitting(false);
          },
          onError: (err: unknown) => {
            setSubmitting(false);
            setProblem(classifyError(err));
          },
        },
      );
    },
    [create, onCreated],
  );

  const setValue = useCallback((next: string) => {
    setValueState(next);
    setProblem(null);
  }, []);

  const message = (() => {
    if (submitting) return { tone: "muted" as const, text: t("newReport.creatingHint") };
    if (problem === "shape")
      return { tone: "error" as const, text: t("newReport.wrongLink") };
    if (problem === "private")
      return { tone: "error" as const, text: t("newReport.privateClip") };
    if (problem === "network")
      return { tone: "error" as const, text: t("newReport.networkError") };
    if (parsed.ok)
      return {
        tone: "mono" as const,
        text: t("newReport.parsed", { id: parsed.id, host: parsed.host }),
      };
    return { tone: "mono" as const, text: t("newReport.hint"), idle: true as const };
  })();

  const validate = useCallback(() => {
    if (value.trim() && !parseClipLink(value).ok) setProblem("shape");
  }, [value]);

  return {
    value,
    validate,
    setValue,
    parsed,
    problem,
    submitting,
    submit,
    message,
    reset: () => {
      setValueState("");
      setProblem(null);
      setSubmitting(false);
    },
  };
}

export type ClipLink = ReturnType<typeof useClipLink>;
