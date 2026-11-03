import { Skeleton } from "@/components/ui/skeleton";

export function InboxSkeleton() {
  return (
    <div aria-busy="true" className="px-4 @3xl:px-8">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="flex h-13 items-center gap-4 border-b border-border px-3"
        >
          <Skeleton className="size-3.5 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3.5 w-[42%]" />
            <Skeleton className="mt-1.5 h-2.5 w-[28%]" />
          </div>
          <Skeleton className="h-1 w-12" />
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );
}
