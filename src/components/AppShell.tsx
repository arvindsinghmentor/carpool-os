import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Car,
  Home,
  LifeBuoy,
  LogOut,
  Search,
  Shield,
  Ticket,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useUnreadCount } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/app", label: "Home", icon: Home },
  { to: "/search", label: "Find", icon: Search },
  { to: "/rides", label: "Drive", icon: Car },
  { to: "/bookings", label: "Trips", icon: Ticket },
  { to: "/profile", label: "You", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: isAdmin } = useIsAdmin();
  const { data: unread } = useUnreadCount();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/app" className="flex items-center gap-2 font-semibold tracking-tight">
            <Car className="size-5 text-primary" /> Carpool OS
          </Link>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" aria-label="Support">
              <Link to="/support">
                <LifeBuoy className="size-4" />
              </Link>
            </Button>
            {isAdmin && (
              <Button asChild variant="ghost" size="icon" aria-label="Admin">
                <Link to="/admin">
                  <Shield className="size-4" />
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="icon" aria-label="Notifications">
              <Link to="/notifications" className="relative">
                <Bell className="size-4" />
                {!!unread && (
                  <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            </Button>
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background">
        <ul className="mx-auto flex max-w-3xl">
          {NAV.map((item) => {
            const active = path === item.to || path.startsWith(`${item.to}/`);
            return (
              <li key={item.to} className="flex-1">
                <Link
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <item.icon className="size-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
