import { useActionQuery } from "@agent-native/core/client/hooks";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** One frame of the recording, fetched through Repro (Clips blocks hotlinks). */
export function useClipFrame(id: string, atMs: number, enabled = true) {
  return useActionQuery(
    "get-clip-frame",
    { id, atMs },
    { enabled, retry: false, staleTime: Number.POSITIVE_INFINITY },
  );
}

export function FramePreview({
  reportId,
  atMs,
  className,
}: {
  reportId: string;
  atMs: number;
  className?: string | undefined;
}) {
  const frame = useClipFrame(reportId, atMs);
  if (frame.data?.dataUrl) {
    return (
      <img
        src={frame.data.dataUrl}
        alt=""
        className={cn("w-56 rounded-sm", className)}
      />
    );
  }
  if (frame.isError) {
    return <p className="text-xs">Frame unavailable</p>;
  }
  return <Skeleton className="aspect-video w-56 rounded-sm" />;
}
