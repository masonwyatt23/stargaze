import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Skeleton that mirrors the dashboard layout — pulse-animated so the
 * page doesn't feel empty during the (auth + Supabase) round-trip on
 * first load.
 */
export default function DashboardLoading() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 md:pt-10">
          {/* Welcome row */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <Bar className="h-7 w-72 md:h-8 md:w-96" />
              <Bar className="h-3 w-64" />
            </div>
            <div className="flex gap-2">
              <Bar className="h-9 w-36" />
              <Bar className="h-9 w-32" />
            </div>
          </div>

          {/* Stat strip */}
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border/70 bg-card/40">
                <CardContent className="space-y-2 p-4">
                  <Bar className="h-3 w-20" />
                  <Bar className="h-7 w-16" />
                  <Bar className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart */}
          <Card className="mt-6 border-border/70 bg-card/40">
            <CardContent className="space-y-3 p-5 md:p-6">
              <div className="flex justify-between">
                <Bar className="h-3 w-44" />
                <Bar className="h-3 w-20" />
              </div>
              <Bar className="h-32 w-full md:h-40" />
              <div className="flex justify-between">
                <Bar className="h-2 w-16" />
                <Bar className="h-2 w-16" />
                <Bar className="h-2 w-16" />
              </div>
            </CardContent>
          </Card>

          {/* Per-project performance */}
          <div className="mt-8 space-y-2">
            <Bar className="h-5 w-48" />
            <Bar className="h-3 w-40" />
            <div className="space-y-2 pt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border/60 bg-card/30 px-4 py-3"
                >
                  <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto]">
                    <div className="space-y-1.5">
                      <Bar className="h-4 w-48" />
                      <Bar className="h-3 w-64" />
                    </div>
                    <Bar className="h-4 w-12" />
                    <Bar className="h-4 w-10" />
                    <Bar className="h-4 w-12" />
                    <Bar className="h-7 w-20" />
                    <Bar className="h-5 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity + Boost ideas */}
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Card className="border-border/70 bg-card/40">
              <CardContent className="space-y-3 p-5">
                <Bar className="h-4 w-32" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 py-1">
                    <Bar className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Bar className="h-3 w-3/4" />
                      <Bar className="h-2 w-16" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-border/70 bg-card/40">
              <CardContent className="space-y-3 p-5">
                <Bar className="h-4 w-24" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <Bar key={i} className="h-3 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Bar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/50",
        className,
      )}
      aria-hidden
    />
  );
}
