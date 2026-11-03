import { Skeleton } from "@/components/ui/skeleton";

export function ReportSkeleton() {
  return (
    <div className="@container min-h-full" aria-busy="true">
      <div className="grid w-full max-w-[76rem] grid-cols-1 gap-x-8 gap-y-10 px-4 pb-16 pt-6 @3xl:grid-cols-[minmax(0,1fr)_17.5rem] @5xl:grid-cols-[minmax(0,1fr)_20rem] @5xl:gap-x-12 @6xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex max-w-[44rem] flex-col gap-8">
          <Skeleton className="h-6 w-2/3" />
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-48" />
              </div>
            ))}
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="aspect-video w-full rounded-lg" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
