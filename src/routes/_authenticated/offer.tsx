import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, ErrorState, Loading, PageTitle } from "@/components/states";
import { formatTime, inr, todayISO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/offer")({
  head: () => ({
    meta: [
      { title: "Publish a Ride — Carpool OS" },
      { name: "description", content: "Share your commute with others." },
      { property: "og:title", content: "Publish a Ride — Carpool OS" },
      { property: "og:description", content: "Share your commute with others." },
    ],
  }),
  component: OfferPage,
});

type RouteRow = {
  id: string;
  user_id: string;
  origin_text: string;
  destination_text: string;
  departure_time: string;
  recurring_days: number[];
  created_at: string;
};

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const publishRideSchema = z.object({
  routeId: z.string().uuid("Please select a valid route."),
  date: z
    .string()
    .regex(datePattern, "Please enter a valid date.")
    .refine((d) => {
      const selectedDate = new Date(`${d}T00:00:00`);
      const today = new Date(`${todayISO()}T00:00:00`);
      return selectedDate >= today;
    }, "Departure date must be today or later."),
  departureTime: z
    .string()
    .regex(timePattern, "Please enter a valid departure time in HH:mm format."),
  availableSeats: z
    .number({
      required_error: "Available seats is required.",
      invalid_type_error: "Available seats must be a number.",
    })
    .int("Available seats must be a whole number.")
    .min(1, "Available seats must be between 1 and 6.")
    .max(6, "Available seats must be between 1 and 6."),
  farePerSeat: z
    .number({
      required_error: "Fare per seat is required.",
      invalid_type_error: "Fare per seat must be a number.",
    })
    .min(0, "Fare must be between ₹0 and ₹5,000.")
    .max(5000, "Fare must be between ₹0 and ₹5,000."),
});

export type PublishRideFormValues = z.infer<typeof publishRideSchema>;

type FormErrors = {
  routeId?: string;
  date?: string;
  departureTime?: string;
  availableSeats?: string;
  farePerSeat?: string;
};

function OfferPage() {
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [date, setDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [availableSeats, setAvailableSeats] = useState("");
  const [farePerSeat, setFarePerSeat] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const routesQuery = useQuery({
    queryKey: ["offer-routes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("id, user_id, origin_text, destination_text, departure_time, recurring_days, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RouteRow[];
    },
  });

  const selectedRoute = routesQuery.data?.find((r) => r.id === selectedRouteId);

  function validate(fields: {
    routeId: string;
    date: string;
    departureTime: string;
    availableSeats: string;
    farePerSeat: string;
  }): FormErrors {
    const rawData = {
      routeId: fields.routeId,
      date: fields.date,
      departureTime: fields.departureTime,
      availableSeats: fields.availableSeats === "" ? NaN : Number(fields.availableSeats),
      farePerSeat: fields.farePerSeat === "" ? NaN : Number(fields.farePerSeat),
    };

    const res = publishRideSchema.safeParse(rawData);
    if (res.success) return {};

    const errs: FormErrors = {};
    for (const issue of res.error.issues) {
      const field = issue.path[0] as keyof FormErrors;
      if (field && !errs[field]) {
        errs[field] = issue.message;
      }
    }
    return errs;
  }

  function handleRouteChange(newRouteId: string) {
    setSelectedRouteId(newRouteId);
    const updated = {
      routeId: newRouteId,
      date,
      departureTime,
      availableSeats,
      farePerSeat,
    };
    setErrors(validate(updated));
  }

  function handleDateChange(newDate: string) {
    setDate(newDate);
    const updated = {
      routeId: selectedRouteId,
      date: newDate,
      departureTime,
      availableSeats,
      farePerSeat,
    };
    setErrors(validate(updated));
  }

  function handleDepartureTimeChange(newTime: string) {
    setDepartureTime(newTime);
    const updated = {
      routeId: selectedRouteId,
      date,
      departureTime: newTime,
      availableSeats,
      farePerSeat,
    };
    setErrors(validate(updated));
  }

  function handleSeatsChange(newSeats: string) {
    setAvailableSeats(newSeats);
    const updated = {
      routeId: selectedRouteId,
      date,
      departureTime,
      availableSeats: newSeats,
      farePerSeat,
    };
    setErrors(validate(updated));
  }

  function handleFareChange(newFare: string) {
    setFarePerSeat(newFare);
    const updated = {
      routeId: selectedRouteId,
      date,
      departureTime,
      availableSeats,
      farePerSeat: newFare,
    };
    setErrors(validate(updated));
  }

  const numSeats = availableSeats === "" ? NaN : Number(availableSeats);
  const numFare = farePerSeat === "" ? NaN : Number(farePerSeat);
  const totalFare = !Number.isNaN(numSeats) && !Number.isNaN(numFare) ? numSeats * numFare : 0;

  const showPreview =
    Boolean(selectedRoute) ||
    Boolean(date) ||
    Boolean(departureTime) ||
    Boolean(availableSeats) ||
    Boolean(farePerSeat);

  return (
    <div>
      <PageTitle title="Publish a Ride" subtitle="Share your commute" />

      <form className="space-y-4" onSubmit={(e) => e.preventDefault()} noValidate>
        <section className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Route
            </h2>

            {routesQuery.isPending && <Loading rows={3} />}
            {routesQuery.error && <ErrorState />}

            {routesQuery.data && routesQuery.data.length === 0 && (
              <EmptyState
                title="No routes found"
                body="Create a route first from your profile to publish a ride."
              />
            )}

            {routesQuery.data && routesQuery.data.length > 0 && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="route-select">Select Route</Label>
                  <Select value={selectedRouteId} onValueChange={handleRouteChange}>
                    <SelectTrigger id="route-select">
                      <SelectValue placeholder="Choose a saved route" />
                    </SelectTrigger>
                    <SelectContent>
                      {routesQuery.data.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.origin_text} → {r.destination_text}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.routeId && (
                    <p className="text-xs font-medium text-destructive">{errors.routeId}</p>
                  )}
                </div>

                {selectedRoute && (
                  <div className="rounded-lg border border-border bg-background p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Route Details
                    </h3>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-card-foreground">
                          {selectedRoute.origin_text}
                        </p>
                        <p className="text-muted-foreground">
                          → {selectedRoute.destination_text}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="size-4 shrink-0 text-muted-foreground" />
                      <p className="text-card-foreground">
                        Departs {formatTime(selectedRoute.departure_time)}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {selectedRoute.recurring_days && selectedRoute.recurring_days.length > 0
                        ? `Runs: ${selectedRoute.recurring_days.join(", ")}`
                        : "One-off"}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 1. Date input */}
            <div className="space-y-1.5">
              <Label htmlFor="departure-date">Departure Date</Label>
              <Input
                id="departure-date"
                type="date"
                min={todayISO()}
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
              />
              {errors.date && (
                <p className="text-xs font-medium text-destructive">{errors.date}</p>
              )}
            </div>

            {/* 2. Time input */}
            <div className="space-y-1.5">
              <Label htmlFor="departure-time">Departure Time</Label>
              <Input
                id="departure-time"
                type="time"
                value={departureTime}
                onChange={(e) => handleDepartureTimeChange(e.target.value)}
              />
              {errors.departureTime && (
                <p className="text-xs font-medium text-destructive">{errors.departureTime}</p>
              )}
            </div>

            {/* 3. Available seats input */}
            <div className="space-y-1.5">
              <Label htmlFor="available-seats">Available Seats</Label>
              <Input
                id="available-seats"
                type="number"
                min={1}
                max={6}
                value={availableSeats}
                onChange={(e) => handleSeatsChange(e.target.value)}
              />
              {errors.availableSeats && (
                <p className="text-xs font-medium text-destructive">{errors.availableSeats}</p>
              )}
            </div>

            {/* 4. Fare per seat input */}
            <div className="space-y-1.5">
              <Label htmlFor="fare-per-seat">Fare per Seat (₹)</Label>
              <Input
                id="fare-per-seat"
                type="number"
                min={0}
                max={5000}
                step={10}
                value={farePerSeat}
                onChange={(e) => handleFareChange(e.target.value)}
              />
              {errors.farePerSeat && (
                <p className="text-xs font-medium text-destructive">{errors.farePerSeat}</p>
              )}
            </div>
          </div>
        </section>

        {/* 7. Preview card */}
        {showPreview && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Form Preview
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-card-foreground">
                  {selectedRoute
                    ? `${selectedRoute.origin_text} → ${selectedRoute.destination_text}`
                    : "No route selected"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-card-foreground">
                  {date || "No date"} {departureTime ? `· ${departureTime}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-card-foreground">
                  {availableSeats ? `${availableSeats} available seat(s)` : "Seats not specified"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">₹</span>
                <span className="text-card-foreground">
                  {farePerSeat !== "" && !Number.isNaN(numFare)
                    ? `${inr(numFare)} per seat`
                    : "Fare not set"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 font-medium">
                <span className="text-muted-foreground">Calculated Total</span>
                <span className="text-foreground">
                  {!Number.isNaN(numSeats) && numSeats > 0 && !Number.isNaN(numFare) && numFare >= 0
                    ? `${numSeats} seat${numSeats === 1 ? "" : "s"} × ${inr(numFare)} = ${inr(totalFare)}`
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}