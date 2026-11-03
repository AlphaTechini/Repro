import { useT } from "@agent-native/core/client/i18n";
import { IconLink } from "@tabler/icons-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { monoMeta, quietInput } from "@/components/repro/ui";

import type { ClipLink } from "./use-clip-link";

interface FieldProps {
  link: ClipLink;
  autoFocus?: boolean | undefined;
  className?: string | undefined;
}

function useSelectOnPrivate(link: ClipLink, ref: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    if (link.problem === "private") ref.current?.select();
  }, [link.problem, ref]);
}

function handlePaste(link: ClipLink, e: React.ClipboardEvent<HTMLInputElement>) {
  const text = e.clipboardData.getData("text");
  if (!text.trim()) return;
  e.preventDefault();
  link.setValue(text.trim());
  link.submit(text);
}

export function ClipLinkMessage({
  link,
  hideIdle,
  className,
}: {
  link: ClipLink;
  hideIdle?: boolean | undefined;
  className?: string | undefined;
}) {
  const { tone, text } = link.message;
  if (hideIdle && "idle" in link.message) return <p className={cn("min-h-4", className)} />;
  return (
    <p
      aria-live="polite"
      className={cn(
        "min-h-4 min-w-0 break-words text-xs",
        tone === "error" && "text-error-ink",
        tone === "muted" && "text-muted-foreground",
        tone === "mono" && monoMeta,
        className,
      )}
    >
      {text}
    </p>
  );
}

/** Inline paste field with its own button: the first-run onboarding step. */
export function ClipLinkInline({ link, autoFocus, className }: FieldProps) {
  const t = useT();
  const ref = useRef<HTMLInputElement>(null);
  useSelectOnPrivate(link, ref);
  const invalid = link.problem != null && link.problem !== "network";
  return (
    <form
      className={cn("flex flex-col gap-2", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (!link.submitting) link.submit(link.value);
      }}
    >
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <IconLink
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={ref}
            value={link.value}
            onChange={(e) => link.setValue(e.target.value)}
            onPaste={(e) => handlePaste(link, e)}
            onBlur={link.validate}
            placeholder={t("newReport.placeholder")}
            aria-label={t("newReport.fieldLabel")}
            aria-invalid={invalid || undefined}
            autoFocus={autoFocus}
            inputMode="url"
            spellCheck={false}
            autoComplete="off"
            readOnly={link.submitting}
            className="h-9 ps-9 aria-invalid:border-level-error aria-invalid:focus-visible:ring-level-error/30"
          />
        </div>
        <Button type="submit" disabled={link.submitting || link.value.trim() === ""}>
          {link.submitting ? <Spinner /> : null}
          {link.submitting
            ? t("newReport.creating")
            : link.problem === "network"
              ? t("newReport.tryAgain")
              : t("newReport.create")}
        </Button>
      </div>
      <ClipLinkMessage link={link} hideIdle />
    </form>
  );
}

/** Command-bar style input row for the dialog. */
export function ClipLinkBar({ link, autoFocus }: FieldProps) {
  const t = useT();
  const ref = useRef<HTMLInputElement>(null);
  useSelectOnPrivate(link, ref);
  const invalid = link.problem != null && link.problem !== "network";
  return (
    <div
      className={cn(
        "flex h-12 items-center gap-2.5 border-b border-border px-4 transition-colors duration-150",
        invalid && "bg-level-error/6",
      )}
    >
      <IconLink
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
      />
      <Input
        ref={ref}
        value={link.value}
        onChange={(e) => link.setValue(e.target.value)}
        onPaste={(e) => handlePaste(link, e)}
            onBlur={link.validate}
        placeholder={t("newReport.placeholder")}
        aria-label={t("newReport.fieldLabel")}
        aria-invalid={invalid || undefined}
        autoFocus={autoFocus}
        inputMode="url"
        spellCheck={false}
        autoComplete="off"
        readOnly={link.submitting}
        className={cn(
          quietInput,
          // The row is the field: the input never draws its own border or ring.
          "mx-0 h-12 border-0 px-0 text-sm shadow-none hover:border-0 focus-visible:border-0 focus-visible:bg-transparent focus-visible:ring-0 aria-invalid:border-0 aria-invalid:ring-0",
        )}
      />
    </div>
  );
}
