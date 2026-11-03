import { useT } from "@agent-native/core/client/i18n";
import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";

import { ClipLinkBar, ClipLinkMessage } from "./ClipLinkField";
import { useClipLink } from "./use-clip-link";

export interface NewReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A link pasted on the page: opens the dialog and submits at once. */
  initialLink?: string | null | undefined;
}

export function NewReportDialog({
  open,
  onOpenChange,
  initialLink,
}: NewReportDialogProps) {
  const t = useT();
  const navigate = useNavigate();
  const onCreated = useCallback(
    ({ id }: { id: string }) => {
      onOpenChange(false);
      navigate(`/reports/${encodeURIComponent(id)}?new=1`);
    },
    [navigate, onOpenChange],
  );
  const link = useClipLink({ onCreated });
  const { setValue, submit, reset } = link;

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    if (initialLink) {
      setValue(initialLink);
      submit(initialLink);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialLink]);

  const canSubmit = link.value.trim() !== "" && !link.submitting;

  return (
    <Dialog open={open} onOpenChange={(next) => !link.submitting && onOpenChange(next)}>
      <DialogContent
        hideClose
        className="top-[18%] translate-y-0 gap-0 p-0 sm:max-w-[34rem]"
      >
        <DialogTitle className="sr-only">{t("newReport.dialogTitle")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("newReport.dialogDescription")}
        </DialogDescription>
        <form
          className="@container"
          onSubmit={(e) => {
            e.preventDefault();
            if (!link.submitting) link.submit(link.value);
          }}
        >
          <ClipLinkBar link={link} autoFocus />
          <ClipLinkMessage link={link} className="min-h-9 px-4 pt-2.5" />
          <div className="flex items-center justify-end gap-3 px-4 pb-3 pt-1">
            <div className="flex shrink-0 items-center gap-2">
              <Kbd className="hidden @sm:inline-flex" aria-hidden="true">
                Esc
              </Kbd>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={link.submitting}
                onClick={() => onOpenChange(false)}
              >
                {t("newReport.cancel")}
              </Button>
              <Button type="submit" size="sm" disabled={!canSubmit}>
                {link.submitting ? <Spinner /> : null}
                {link.submitting
                  ? t("newReport.creating")
                  : link.problem === "network"
                    ? t("newReport.tryAgain")
                    : t("newReport.create")}
                {!link.submitting ? (
                  <Kbd className="hidden border-0 bg-primary-foreground/15 text-primary-foreground/80 @sm:inline-flex" aria-hidden="true">
                    ↵
                  </Kbd>
                ) : null}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
