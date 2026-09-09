import { createFileRoute, Link } from "@tanstack/react-router";
import { Car, Search, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Carpool OS — Share your daily commute in Noida" },
      {
        name: "description",
        content:
          "Carpool OS connects drivers with empty seats to passengers on the same daily route. Verified profiles, fixed fares in rupees, no haggling.",
      },
      { property: "og:title", content: "Carpool OS — Share your daily commute" },
      {
        property: "og:description",
        content:
          "Find or offer a recurring carpool in Noida. Verified riders, fixed fares, seats reserved instantly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <span className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
          <Car className="size-5 text-primary" /> Carpool OS
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20">
        <section className="pt-8 pb-12">
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            The same route, every morning. Share it.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Carpool OS matches drivers who have empty seats with passengers travelling the
            same way at the same time. Fixed fares in rupees, verified profiles, seats
            reserved the moment a driver accepts.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="sm:w-auto">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Search className="mr-1 size-4" /> Find a ride
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Car className="mr-1 size-4" /> Offer a ride
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Search,
              title: "Matched on your route",
              body: "Search by pickup, drop and time. Only rides with free seats near you appear.",
            },
            {
              icon: ShieldCheck,
              title: "Seats held safely",
              body: "A seat is reserved the moment your request is accepted — never double-booked.",
            },
            {
              icon: Star,
              title: "Ratings both ways",
              body: "Drivers and passengers rate each other after every completed trip.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-card p-5">
              <f.icon className="size-5 text-primary" />
              <h2 className="mt-3 text-base font-semibold text-card-foreground">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
