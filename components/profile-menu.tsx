"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut, Settings, LayoutDashboard, User as UserIcon, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Props = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

/**
 * Avatar button + dropdown menu in the nav.
 * Click → reveals: View profile · Dashboard · Saves · Settings · Sign out.
 * Sign out is a real form POST to /auth/sign-out so the route can clear cookies.
 */
export function ProfileMenu({ username, displayName, avatarUrl }: Props) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Avatar
          className={cn(
            "h-8 w-8 ring-1 transition-all",
            open ? "ring-primary" : "ring-border",
          )}
        >
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={username} /> : null}
          <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 origin-top-right overflow-hidden rounded-xl border border-border bg-popover/95 text-popover-foreground shadow-2xl shadow-black/40 backdrop-blur-lg"
        >
          <div className="border-b border-border/60 px-4 py-3">
            <div className="text-sm font-semibold leading-tight">
              {displayName ?? username}
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              @{username}
            </div>
          </div>

          <div className="py-1">
            <MenuItem
              href={`/u/${username}`}
              icon={<UserIcon className="h-4 w-4" />}
              label="View profile"
              onClose={() => setOpen(false)}
            />
            <MenuItem
              href="/dashboard"
              icon={<LayoutDashboard className="h-4 w-4" />}
              label="Dashboard"
              onClose={() => setOpen(false)}
            />
            <MenuItem
              href="/saves"
              icon={<Star className="h-4 w-4" />}
              label="Saves"
              onClose={() => setOpen(false)}
            />
            <MenuItem
              href="/settings"
              icon={<Settings className="h-4 w-4" />}
              label="Settings"
              onClose={() => setOpen(false)}
            />
          </div>

          <form
            action="/auth/sign-out"
            method="post"
            className="border-t border-border/60"
          >
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10 focus-visible:bg-destructive/10 focus-visible:outline-none"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  href,
  icon,
  label,
  onClose,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      role="menuitem"
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
