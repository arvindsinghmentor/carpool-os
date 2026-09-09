import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Flag, ShieldCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState, Loading, PageTitle } from "@/components/states";
import { RIDE_SELECT, fetchPublicProfiles, type RideRow } from "@/lib/data";
import { errorMessage, formatDate, formatDays, formatTime, inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/ride/$rideId")({
  head: () => ({
    meta: [
      { title: "Ride details — Carpool OS" },
      { name: "description", content: "Driver, vehicle, seats and fare for this carpool ride." },
      { property: "og:title", content: "Ride details — Carpool OS" },
      { property: "og:description", content: "Driver, vehicle, seats and fare for this ride." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RideDetail,
});

function RideDetail() {
  const { rideId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [seats, setSeats] = useState("1");
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["ride", rideId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select(RIDE_SELECT)
        .eq("id", rideId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Ride not found");
      const ride = data as unknown as RideRow;
      const [profiles, vehicles] = await Promise.all([
        fetchPublicProfiles([ride.driver_id]),
        supabase.from("vehicles").select("*").eq("user_id", ride.driver_id).limit(1),
      ]);
      return { ride, driver: profiles[ride.driver_id], vehicle: vehicles.data?.[0] ?? null };
    },
  });

  async function book() {
    setBusy(true);
    const { error } = await supabase.rpc("create_booking", {
      _ride_id: rideId,
      _seats: Number(seats),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Seat requested. The driver will confirm shortly.");
    qc.invalidateQueries();
    navigate({ to: "/bookings" });
  }

  async function block(id: string) {
    const { error } = await supabase.from("user_blocks").insert({ blocker_id: (await supabase.auth.getUser()).data.user!.id, blocked_id: id });
    if (error) return toast.error(error.message);
    toast.success("Driver blocked. They won't appear in your matches.");
  }

  if (q.isPending) return <Loading />;
  if (q.error || !q.data) return <ErrorState message={errorMessage(q.error)} />;

  const { ride, driver, vehicle } = q.data;
  const seatOptions = Array.from({ length: Math.max(ride.available_seats, 1) }, (_, i) => i + 1);
  const bookable = ride.status === "active" && ride.available_seats > 0;

  return (
    <div>
      <PageTitle
        title={`${ride.routes?.origin_text?.split(",")[0]} → ${ride.routes?.destination_text?.split(",")[0]}`}
        subtitle={`${formatDate(ride.date)} · ${formatTime(ride.departure_time)}`}
      />

      <div className="space-y-4">
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Driver
          </h2>
          <p className="mt-2 font-medium">
            {driver?.name ?? "Driver"}
            {driver?.verification_status === "verified" && (
              <ShieldCheck className="ml-1 inline size-4 text-primary" />
            )}
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="size-3.5 fill-current" />
            {Number(driver?.rating ?? 0).toFixed(1)} · {driver?.reliability_score ?? 100}% reliable
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => block(ride.driver_id)}>
              <Ban className="mr-1 size-3.5" /> Block
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`/support?user=${ride.driver_id}`}>
                <Flag className="mr-1 size-3.5" /> Report
              </a>
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Vehicle
          </h2>
          {vehicle ? (
            <p className="mt-2 text-sm">
              {vehicle.make} {vehicle.model} ({vehicle.year}) · {vehicle.seat_capacity} seats ·{" "}
              {vehicle.registration_number}
              {vehicle.verification_status === "verified" && (
                <Badge className="ml-2">verified</Badge>
              )}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Vehicle details not shared.</p>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Route
          </h2>
          <p className="mt-2 text-sm">{ride.routes?.origin_text}</p>
          <p className="mt-1 text-sm">{ride.routes?.destination_text}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Runs: {formatDays(ride.routes?.recurring_days)}
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Fare per seat</span>
            <span className="text-xl font-semibold">{inr(ride.price_per_passenger)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {ride.available_seats} of {ride.total_seats} seats available · status {ride.status}
          </p>

          {bookable ? (
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label>Seats</Label>
                <Select value={seats} onValueChange={setSeats}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {seatOptions.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={book} disabled={busy}>
                Request {seats} seat{seats === "1" ? "" : "s"} ·{" "}
                {inr(Number(ride.price_per_passenger) * Number(seats))}
              </Button>
              <p className="text-xs text-muted-foreground">
                Payment is recorded as pending — online payment integration is not live yet, so
                settle the fare with your driver.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              This ride is not open for booking.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
