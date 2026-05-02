import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function NotificationsEmptyState() {
  return (
    <Card className="border-dashed bg-card/40">
      <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
        <span
          aria-hidden
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <Bell className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">No notifications yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            When someone right-swipes one of your projects or asks for access,
            it&apos;ll show up here. Submit a project to start seeing activity.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button asChild size="sm">
            <Link href="/projects/new">Submit a project</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/feed">Open the deck</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
