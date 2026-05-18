import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

export default function Loading() {
  return (
    <section className="mx-auto flex w-full max-w-[100rem] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-9 w-72 max-w-full" />
          <SkeletonBlock className="h-5 w-[34rem] max-w-full" />
        </div>
        <div className="flex gap-2">
          <SkeletonBlock className="h-9 w-28" />
          <SkeletonBlock className="h-9 w-28" />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="rounded-lg border-border bg-card shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between">
                <SkeletonBlock className="size-10" />
                <SkeletonBlock className="h-6 w-16 rounded-full" />
              </div>
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-7 w-20" />
              <SkeletonBlock className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className="rounded-lg border-border bg-card shadow-sm">
            <CardHeader className="p-5 pb-3">
              <SkeletonBlock className="h-5 w-36" />
            </CardHeader>
            <CardContent className="grid gap-3 p-5 pt-0 sm:grid-cols-2">
              {Array.from({ length: index === 0 ? 6 : 4 }).map((__, itemIndex) => (
                <SkeletonBlock key={itemIndex} className="h-20" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className="rounded-lg border-border bg-card shadow-sm">
            <CardHeader className="p-5 pb-3">
              <SkeletonBlock className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-3 p-5 pt-0">
              {Array.from({ length: 4 }).map((__, itemIndex) => (
                <SkeletonBlock key={itemIndex} className="h-14" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
