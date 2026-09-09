import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, Star, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PlaceInput } from "@/components/PlaceInput";
import { EmptyState, ErrorState, Loading, PageTitle } from "@/components/states";
import { RIDE_SELECT, fetchBlockedIds, fetchPublicProfiles, type RideRow } from "@/lib/data";
import { formatDate, formatTime, inr, todayISO } from "@/lib/format";
import { MATCHING_CONFIG, matchRides } from "@/lib/matching";
import type { Place } from "@/lib/geo";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Find a ride — Carpool OS" },
      {
        name: "description",
        content: "Search carpool rides matching your pickup, drop and departure time.",
      },
      { property: "og:title", content: "Find a ride — Carpool OS" },
      { property: "og:description", content: "Search carpool rides on your daily route." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

type Criteria = {
  origin: Place;
  destination: Place;
  date: string;
  time: string;
};

function SearchPage() {
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("09:00");
  const [criteria, setCriteria] = useState<Criteria | null>(null);

  const results = useQuery({
    queryKey: ["search", criteria],
    enabled: !!criteria,
    queryFn: async () => {
      const c = criteria!;
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user!.id;

      const [ridesRes, blocked] = await Promise.all([
        supabase
          .from("rides")
          .select(RIDE_SELECT)
          .eq("status", "active")
          .eq("date", c.date)
          .gt("available_seats", 0),
        fetchBlockedIds(),
      ]);
      if (ridesRes.error) throw ridesRes.error;
      const rides = ((ridesRes.data ?? []) as unknown as RideRow[]).filter(
        (r) => r.driver_id !== uid && r.routes,
      );

      const profiles = await fetchPublicProfiles(rides.map((r) => r.driver_id));

      const matches = matchRides(
        {
          originLat: c.origin.lat,
          originLng: c.origin.lng,
          destinationLat: c.destination.lat,
          destinationLng: c.destination.lng,
          departureTime: c.time,
          date: c.date,
        },
        rides.map((r) => ({
          rideId: r.id,
          driverId: r.driver_id,
          date: r.date,
          departureTime: r.departure_time,
          availableSeats: r.available_seats,
          rideStatus: r.status,
          tripStatus: r.trips?.[0]?.status ?? null,
          driverAccountStatus: profiles[r.driver_id]?.account_status ?? "active",
          driverRating: profiles[r.driver_id]?.rating ?? 0,
          driverReliability: profiles[r.driver_id]?.reliability_score ?? 100,
          originLat: r.routes!.origin_lat,
          originLng: r.routes!.origin_lng,
          destinationLat: r.routes!.destination_lat,
          destinationLng: r.routes!.destination_lng,
          blocked: blocked.has(r.driver_id),
          ride: r,
        })),
      );

      return { matches, profiles };
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!origin || !destination) return;
    setCriteria({ origin, destination, date, time });
  }

  return (
    <div>
      <PageTitle
        title="Find a ride"
        subtitle={`Rides within ${MATCHING_CONFIG.maxOriginRadiusKm} km of your pickup and ${MATCHING_CONFIG.maxTimeToleranceMinutes} minutes of your time.`}
      />

      <form onSubmit={submit} className="space-y-4 rounded-lg border border-border bg-card p-4">
        <PlaceInput label="Pickup" value={origin} onChange={setOrigin} />
        <PlaceInput label="Drop" value={destination} onChange={setDestination} />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              min={todayISO()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="time">Departure</Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={!origin || !destination}>
          <SearchIcon className="mr-1 size-4" /> Search
        </Button>
      </form>

      <div className="mt-6">
        {results.isPending && criteria && <Loading />}
        {results.error && <ErrorState />}
        {results.data && results.data.matches.length === 0 && (
          <EmptyState
            title="No matching rides"
            body="Try a wider departure time or a different date."
          />
        )}
        {results.data && results.data.matches.length > 0 && (
          <ul className="space-y-3">
            {results.data.matches.map((m) => {
              const ride = (m.candidate as unknown as { ride: RideRow }).ride;
              const driver = results.data.profiles[ride.driver_id];
              return (
                <li key={ride.id}>
                  <Link
                    to="/ride/$rideId"
                    params={{ rideId: ride.id }}
                    className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-card-foreground">
                          {driver?.name ?? "Driver"}
                          {driver?.verification_status === "verified" && (
                            <ShieldCheck className="ml-1 inline size-3.5 text-primary" />
                          )}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="size-3 fill-current" />
                          {Number(driver?.rating ?? 0).toFixed(1)} · {driver?.reliability_score ?? 100}
                          % reliable
                        </p>
                        <p className="mt-2 truncate text-sm text-muted-foreground">
                          {ride.routes?.origin_text} → {ride.routes?.destination_text}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(ride.date)} · {formatTime(ride.departure_time)} ·{" "}
                          {ride.available_seats} seat{ride.available_seats === 1 ? "" : "s"} left
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {m.originDistanceKm.toFixed(1)} km from pickup ·{" "}
                          {m.timeDifferenceMinutes} min from your time
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-semibold">{inr(ride.price_per_passenger)}</p>
                        <Badge variant="secondary" className="mt-1">
                          per seat
                        </Badge>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
