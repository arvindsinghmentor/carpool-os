import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Car, MapPin, Clock, CalendarDays, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { errorMessage, formatTime, inr, todayISO } from "@/lib/format";
import { z } from "zod";

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

const publishRideSchema = z.object({
  routeId: z.string().uuid("Please select a valid route."),
  date: z
    .string()
    .regex(datePattern, "Please enter a valid date.")
    .refine(
      (date) => {
        const selectedDate = new Date(`${date}T00:00:00`);
        const today = new Date(todayISO());
        return selectedDate >= today;
      },
      "Departure date must be today or later.",
    ),
  departureTime: z
    .string()
    .regex(timePattern, "Please enter a valid time in HH:mm format."),
  availableSeats: z
    .number({
      required_error: "Available seats is required.",
      invalid_type_error: "Available seats must be a number.",
    })
    .int("Available seats must be a whole number.")
    .min(1, "Available seats must be at least 1.")
    .max(6, "Available seats cannot exceed 6."),
  farePerSeat: z
    .number({
      required_error: "Fare per seat is required.",
      invalid_type_error: "Fare per seat must be a number.",
    })
    .int("Fare must be a whole number.")
    .min(0, "Fare must be at least ₹0.")
    .max(5000, "Fare cannot exceed ₹5,000."),
});

type PublishRideFormValues = z.infer<typeof publishRideSchema>;

type PublishRideFormErrors = Partial<
  Record<keyof PublishRideFormValues, string>
>;

function OfferPage() {
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [date, setDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [availableSeats, setAvailableSeats] = useState("");
  const [farePerSeat, setFarePerSeat] = useState("");
  const [errors, setErrors] = useState<PublishRideFormErrors>({});

  const routesQuery = useQuery({
    queryKey: ["offer-routes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("id, origin_text, destination_text, departure_time, recurring_days, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RouteRow[];
    },
  });

  const selectedRoute = routesQuery.data?.find(
    (r) => r.id === selectedRouteId,
  );

  function validate(values: Partial<PublishRideFormValues>) {
    const result = publishRideSchema.safeParse(values);
    if (result.success) return {};

    const fieldErrors: PublishRideFormErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof PublishRideFormValues;
      if (field && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return fieldErrors;
  }

  function updateField<K extends keyof PublishRideFormValues>(
    field: K,
    value: PublishRideFormValues[K],
  ) {
    const nextValues: Partial<PublishRideFormValues> = {
      routeId: selectedRouteId,
      date,
      departureTime,
      availableSeats: availableSeats === "" ? undefined : Number(availableSeats),
      farePerSeat: farePerSeat === "" ? undefined : Number(farePerSeat),
    };
    (nextValues as Record<string, unknown>)[field] = value;

    setDate(nextValues.date ?? "");
    setDepartureTime(nextValues.departureTime ?? "");
    setAvailableSeats(String(nextValues.availableSeats ?? ""));
    setFarePerSeat(String(nextValues.farePerSeat ?? ""));
    setSelectedRouteId(nextValues.routeId ?? "");
    setErrors(validate(nextValues));
  }

  const hasAnyValue =
    selectedRouteId !== "" ||
    date !== "" ||
    departureTime !== "" ||
    availableSeats !== "" ||
    farePerSeat !== "";

  const previewValues = publishRideSchema.safeParse({
    routeId: selectedRouteId,
    date,
    departureTime,
    availableSeats: availableSeats === "" ? undefined : Number(availableSeats),
    farePerSeat: farePerSeat === "" ? undefined : Number(farePerSeat),
  });

  return (
    <div>
      <PageTitle title="Publish a Ride" subtitle="Share your commute" />

      <form className="space-y-4" noValidate>
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
                  <Label htmlFor="route">Select Route</Label>
                  <Select
                    value={selectedRouteId}
                    onValueChange={(value) => {
                      setSelectedRouteId(value);
                      setErrors((prev) => ({ ...prev, routeId: undefined }));
                    }}
                  >
                    <SelectTrigger id="route">
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
                    <p className="text-sm text-destructive">{errors.routeId}</p>
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
                      {selectedRoute.recurring_days.length > 0
                        ? `Runs: ${selectedRoute.recurring_days.join(", ")}`
                        : "One-off"}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="date">Departure Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                min={todayISO()}
                onChange={(e) => {
                  setDate(e.target.value);
                  setErrors((prev) => ({ ...prev, date: undefined }));
                  updateField("date", e.target.value);
                }}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="departureTime">Departure Time</Label>
              <Input
                id="departureTime"
                type="time"
                value={departureTime}
                onChange={(e) => {
                  setDepartureTime(e.target.value);
                  setErrors((prev) => ({ ...prev, departureTime: undefined }));
                  updateField("departureTime", e.target.value);
                }}
              />
              {errors.departureTime && (
                <p className="text-sm text-destructive">
                  {errors.departureTime}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="availableSeats">Available Seats</Label>
              <Input
                id="availableSeats"
                type="number"
                min="1"
                max="6"
                value={availableSeats}
                onChange={(e) => {
                  setAvailableSeats(e.target.value);
                  setErrors((prev) => ({ ...prev, availableSeats: undefined }));
                  updateField("availableSeats", e.target.value);
                }}
              />
              {errors.availableSeats && (
                <p className="text-sm text-destructive">
                  {errors.availableSeats}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="farePerSeat">Fare per Seat (₹)</Label>
              <Input
                id="farePerSeat"
                type="number"
                min="0"
                max="5000"
                step="10"
                value={farePerSeat}
                onChange={(e) => {
                  setFarePerSeat(e.target.value);
                  setErrors((prev) => ({ ...prev, farePerSeat: undefined }));
                  updateField("farePerSeat", e.target.value);
                }}
              />
              {errors.farePerSeat && (
                <p className="text-sm text-destructive">
                  {errors.farePerSeat}
                </p>
              )}
            </div>
          </div>
        </section>

        {hasAnyValue && previewValues.success && (
          <div className="rounded-lg border border-border bg-background p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Form Preview
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" />
                <span className="text-card-foreground">
                  {selectedRoute?.origin_text} → {selectedRoute?.destination_text}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" />
                <span className="text-card-foreground">
                  {date} · {departureTime}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                <span className="text-card-foreground">
                  {previewValues.data.availableSeats} available seats
                </span>
              </div>
              <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">₹</span>
                              <span className="text-card-foreground">
                                {inr(previewValues.data.farePerSeat)} per seat
                              </span>
                            </div>
              <div className="flex items-center gap-2 border-t border-border pt-3 font-semibold">
                <span>Total Fare</span>
                <span className="text-primary">
                  {previewValues.data.availableSeats} seats × {inr(previewValues.data.farePerSeat)} = {inr(previewValues.data.availableSeats * previewValues.data.farePerSeat)}
                </span>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
