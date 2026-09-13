import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Car, MapPin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, ErrorState, Loading, PageTitle } from "@/components/states";
import { errorMessage, formatTime } from "@/lib/format";

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

function OfferPage() {
  const [selectedRouteId, setSelectedRouteId] = useState("");

  const routesQuery = useQuery({
    queryKey: ["offer-routes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RouteRow[];
    },
  });

  const selectedRoute = routesQuery.data?.find(
    (r) => r.id === selectedRouteId,
  );

  return (
    <div>
      <PageTitle title="Publish a Ride" subtitle="Share your commute" />

      <form className="space-y-4">
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Select Route
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
              <Select
                value={selectedRouteId}
                onValueChange={setSelectedRouteId}
              >
                <SelectTrigger>
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
        </section>
      </form>
    </div>
  );
}