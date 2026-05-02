import { Sparkles, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Props = { profileSize: number };

/**
 * Tiny pill rendered above the deck so the user knows whether the feed is
 * already personalized or still being learned.
 */
export function PersonalizationBadge({ profileSize }: Props) {
  if (profileSize === 0) return null;

  if (profileSize >= 5) {
    return (
      <Badge variant="outline" className="gap-1 border-primary/40 bg-primary/10 text-primary">
        <Sparkles className="h-3 w-3" />
        Personalized for you
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <Star className="h-3 w-3" />
      Building your taste · {profileSize} of 5
    </Badge>
  );
}
