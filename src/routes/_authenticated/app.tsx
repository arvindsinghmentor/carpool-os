import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Car, MapPin, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, Loading, PageTitle } from "@/components/states";
import { RIDE_SELECT, type RideRow } from "@/lib/data";
import { formatDate, formatTime, inr, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Your commute — Carpool OS" },
      { name: "description", content: "Your next carpool trips, at a glance." },
      { property: "og:title", content: "Your commute — Carpool OS" },
      { property: "og:description", content: "Your next carpool trips, at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function useUpcoming() {
  return useQuery({
    queryKey: ["home-upcoming"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user!.id;
      const today = todayISO();

      const [driving, booked] = await Promise.all([
        supabase
          .from("rides")
          .select(RIDE_SELECT)
          .eq("driver_id", uid)
          .in("status", ["draft", "active"])
          .gte("date", today)
          .order("date")
          .order("departure_time"),
        supabase
          .from("bookings")
          .select(`*, rides!inner(${RIDE_SELECT})`)
          .in("status", ["requested", "confirmed"])
          .gte("rides.date", today)
          .order("created_at", { ascending: false }),
      ]);
      if (driving.error) throw driving.error;
      if (booked.error) throw booked.error;
      return {
        driving: (driving.data ?? []) as unknown as RideRow[],
        booked: (booked.data ?? []) as unknown as Array<{
          id: string;
          seats: number;
          amount: number;
          status: string;
          rides: RideRow;
        }>,
      };
    },
  });
}

function HomePage() {
  const { data: profile } = useMyProfile();
  const { data, isPending, error } = useUpcoming();

  return (
    <div>
      <PageTitle
        title={profile?.name ? `Hello, ${profile.name.replace("[DEMO] ", "")}` : "Your commute"}
        subtitle="Your next trips as a driver and as a passenger."
      />

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Button asChild size="lg">
          <Link to="/search">
            <Search className="mr-1 size-4" /> Find a ride
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/offer">
            <Car className="mr-1 size-4" /> Offer a ride
          </Link>
        </Button>
      </div>

      {profile?.account_status === "suspended" && (
        <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Your account is suspended. You cannot offer or book rides right now.
        </div>
      )}

      {isPending && <Loading />}
      {error && <ErrorState />}

      {data && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              You are driving
            </h2>
            {data.driving.length === 0 ? (
              <EmptyState
                title="No rides offered yet"
                body="Publish a ride with your spare seats and passengers can request them."
                action={
                  <Button asChild size="sm">
                    <Link to="/offer">Offer a ride</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {data.driving.map((r) => (
                  <li key={r.id}>
                    <Link to="/rides" className="block">
                      <RideSummary ride={r} trailing={<Badge>{r.status}</Badge>} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              You are riding
            </h2>
            {data.booked.length === 0 ? (
              <EmptyState
                title="No upcoming bookings"
                body="Search your route and request a seat."
                action={
                  <Button asChild size="sm">
                    <Link to="/search">Find a ride</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {data.booked.map((b) => (
                  <li key={b.id}>
                    <Link to="/bookings" className="block">
                      <RideSummary
                        ride={b.rides}
                        trailing={
                          <div className="text-right">
                            <Badge variant={b.status === "confirmed" ? "default" : "secondary"}>
                              {b.status}
                            </Badge>
                            <p className="mt-1 text-sm font-medium">{inr(b.amount)}</p>
                          </div>
                        }
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export function RideSummary({
  ride,
  trailing,
}: {
  ride: RideRow;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-card-foreground">
          {formatDate(ride.date)} · {formatTime(ride.departure_time)}
        </p>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0" />
          <span className="truncate">
            {ride.routes?.origin_text} → {ride.routes?.destination_text}
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {ride.available_seats} of {ride.total_seats} seats free ·{" "}
          {inr(ride.price_per_passenger)} per seat
        </p>
      </div>
      {trailing}
    </div>
  );
}
