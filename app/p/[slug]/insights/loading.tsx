import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Card, CardContent } from "@/components/ui/card";

export default function InsightsLoading() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 md:pt-12">
          <div className="mb-6 h-4 w-40 animate-pulse rounded bg-secondary" />
          <div className="mb-8 space-y-3">
            <div className="h-7 w-20 animate-pulse rounded bg-secondary" />
            <div className="h-9 w-72 animate-pulse rounded bg-secondary" />
            <div className="h-4 w-96 animate-pulse rounded bg-secondary" />
          </div>
          <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i} className="border-border/60 bg-card/60">
                <CardContent className="p-4">
                  <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
                  <div className="mt-2 h-7 w-16 animate-pulse rounded bg-secondary" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="mb-10 border-border/60 bg-card/60">
            <CardContent className="p-6">
              <div className="h-4 w-32 animate-pulse rounded bg-secondary" />
              <div className="mt-4 h-24 w-full animate-pulse rounded bg-secondary" />
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
