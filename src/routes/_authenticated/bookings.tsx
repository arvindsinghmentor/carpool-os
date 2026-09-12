import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, Clock, MapPin, Ticket, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, Loading, PageTitle } from "@/components/states";
import { RIDE_SELECT, type RideRow } from "@/lib/data";
import { errorMessage, formatDate, formatTime, inr } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({
    meta: [
      { title: "Trips — Carpool OS" },
      { name: "description", content: "Your bookings and incoming requests." },
      { property: "og:title", content: "Trips — Carpool OS" },
      { property: "og:description", content: "Your bookings and incoming requests." },
    ],
  }),
  component: BookingsPage,
});

function useMyBookings() {
  return useQuery({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user!.id;

      const [asPassenger, asDriver] = await Promise.all([
        supabase
          .from("bookings")
          .select(`*, rides!inner(${RIDE_SELECT})`)
          .eq("passenger_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("bookings")
          .select(`*, rides!inner(${RIDE_SELECT})`)
          .eq("rides.driver_id", uid)
          .in("status", ["requested", "confirmed"])
          .order("created_at", { ascending: false }),
      ]);

      if (asPassenger.error) throw asPassenger.error;
      if (asDriver.error) throw asDriver.error;

      return {
        asPassenger: (asPassenger.data ?? []) as unknown as Array<{
          id: string;
          seats: number;
          amount: number;
          status: string;
          created_at: string;
          cancelled_at: string | null;
          rides: RideRow;
        }>,
        asDriver: (asDriver.data ?? []) as unknown as Array<{
          id: string;
          seats: number;
          amount: number;
          status: string;
          created_at: string;
          passenger_id: string;
          cancelled_at: string | null;
          rides: RideRow;
        }>,
      };
    },
  });
}

function BookingsPage() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, isPending, error } = useMyBookings();

  async function cancel(id: string): Promise<void> {
    setBusyId(id);
    const { error: e } = await supabase.rpc("cancel_booking", { _booking_id: id });
    setBusyId(null);
    if (e) { toast.error(errorMessage(e)); return; }
    toast.success("Booking cancelled.");
    qc.invalidateQueries();
  }

  async function respond(id: string, accept: boolean): Promise<void> {
    setBusyId(id);
    const { error: e } = await supabase.rpc("respond_booking", {
      _booking_id: id,
      _accept: accept,
    });
    setBusyId(null);
    if (e) { toast.error(errorMessage(e)); return; }
    toast.success(accept ? "Booking confirmed." : "Booking declined.");
    qc.invalidateQueries();
  }

  if (isPending) return <Loading rows={4} />;
  if (error || !data) return <ErrorState message={errorMessage(error)} />;

  const { asPassenger, asDriver } = data;

  return (
    <div>
      <PageTitle
        title="Trips"
        subtitle="Your bookings and incoming requests."
      />

      <div className="space-y-6">
        {/* Driver section: incoming requests */}
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Requests for your rides
          </h2>
          {asDriver.length === 0 ? (
            <EmptyState
              title="No pending requests"
              body="When someone requests a seat on your ride, it will appear here."
            />
          ) : (
            <ul className="space-y-3">
              {asDriver.map((b) => (
                <li key={b.id}>
                  <BookingCard
                    booking={b}
                    actions={
                      b.status === "requested" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => respond(b.id, true)}
                            disabled={busyId === b.id}
                          >
                            <UserCheck className="mr-1 size-3.5" /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => respond(b.id, false)}
                            disabled={busyId === b.id}
                          >
                            <X className="mr-1 size-3.5" /> Decline
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="default">{b.status}</Badge>
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Passenger section: my bookings */}
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            My bookings
          </h2>
          {asPassenger.length === 0 ? (
            <EmptyState
              title="No bookings yet"
              body="Find a ride and request a seat."
            />
          ) : (
            <ul className="space-y-3">
              {asPassenger.map((b) => (
                <li key={b.id}>
                  <BookingCard
                    booking={b}
                    actions={
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            b.status === "confirmed"
                              ? "default"
                              : b.status === "requested"
                                ? "secondary"
                                : b.status === "cancelled"
                                  ? "destructive"
                                  : "outline"
                          }
                        >
                          {b.status}
                        </Badge>
                        {b.status === "requested" || b.status === "confirmed" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancel(b.id)}
                            disabled={busyId === b.id}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  actions,
}: {
  booking: {
    id: string;
    seats: number;
    amount: number;
    status: string;
    created_at: string;
    cancelled_at: string | null;
    rides: RideRow;
  };
  actions?: React.ReactNode;
}) {
  const r = booking.rides;
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-card-foreground">
          {formatDate(r.date)} · {formatTime(r.departure_time)}
        </p>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0" />
          <span className="truncate">
            {r.routes?.origin_text} → {r.routes?.destination_text}
          </span>
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Car className="size-3.5" />
          {booking.seats} seat{booking.seats === 1 ? "" : "s"} · {inr(booking.amount)}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          Requested {new Date(booking.created_at).toLocaleString("en-IN")}
          {booking.cancelled_at && (
            <> · cancelled {new Date(booking.cancelled_at).toLocaleString("en-IN")}</>
          )}
        </p>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}