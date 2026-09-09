import { haversineKm, minutesBetween } from "@/lib/geo";
import { MATCHING_CONFIG, type MatchingConfig } from "./config";

export { MATCHING_CONFIG };

export type MatchRequest = {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  /** "HH:MM" desired departure time; optional. */
  departureTime?: string | null;
  /** ISO date the passenger wants to travel; optional. */
  date?: string | null;
};

export type MatchCandidate = {
  rideId: string;
  driverId: string;
  date: string;
  departureTime: string;
  availableSeats: number;
  rideStatus: string;
  tripStatus?: string | null;
  driverAccountStatus: string;
  driverRating: number;
  driverReliability: number;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  /** Ids the requesting user has blocked or been blocked by. */
  blocked?: boolean;
};

export type MatchResult<T extends MatchCandidate = MatchCandidate> = {
  candidate: T;
  score: number;
  originDistanceKm: number;
  destinationDistanceKm: number;
  timeDifferenceMinutes: number;
  breakdown: Record<string, number>;
};

/** A candidate passes only when every hard filter passes. */
export function isEligible(
  req: MatchRequest,
  c: MatchCandidate,
  cfg: MatchingConfig = MATCHING_CONFIG,
): boolean {
  if (c.rideStatus !== "active") return false;
  if (c.tripStatus && c.tripStatus !== "scheduled") return false;
  if (c.availableSeats < 1) return false;
  if (c.driverAccountStatus !== "active") return false;
  if (c.blocked) return false;
  if (req.date && c.date !== req.date) return false;
  if (
    req.departureTime &&
    minutesBetween(req.departureTime, c.departureTime) > cfg.maxTimeToleranceMinutes
  )
    return false;
  const oKm = haversineKm(req.originLat, req.originLng, c.originLat, c.originLng);
  if (oKm > cfg.maxOriginRadiusKm) return false;
  const dKm = haversineKm(
    req.destinationLat,
    req.destinationLng,
    c.destinationLat,
    c.destinationLng,
  );
  if (dKm > cfg.maxDestinationRadiusKm) return false;
  return true;
}

const decay = (value: number, max: number) =>
  max <= 0 ? 0 : Math.max(0, 1 - Math.min(value, max) / max);

/** Filter + rank. Pure and deterministic: same input, same order. */
export function matchRides<T extends MatchCandidate>(
  req: MatchRequest,
  candidates: T[],
  cfg: MatchingConfig = MATCHING_CONFIG,
): MatchResult<T>[] {
  const requestedKm = haversineKm(
    req.originLat,
    req.originLng,
    req.destinationLat,
    req.destinationLng,
  );

  return candidates
    .filter((c) => isEligible(req, c, cfg))
    .map((c) => {
      const originDistanceKm = haversineKm(
        req.originLat,
        req.originLng,
        c.originLat,
        c.originLng,
      );
      const destinationDistanceKm = haversineKm(
        req.destinationLat,
        req.destinationLng,
        c.destinationLat,
        c.destinationLng,
      );
      const timeDifferenceMinutes = req.departureTime
        ? minutesBetween(req.departureTime, c.departureTime)
        : 0;

      const rideKm = haversineKm(c.originLat, c.originLng, c.destinationLat, c.destinationLng);
      const routeSimilarity =
        requestedKm <= 0 && rideKm <= 0
          ? 1
          : decay(Math.abs(rideKm - requestedKm), Math.max(requestedKm, rideKm, 1));

      const breakdown = {
        routeSimilarity: routeSimilarity * cfg.weights.routeSimilarity,
        originProximity:
          decay(originDistanceKm, cfg.maxOriginRadiusKm) * cfg.weights.originProximity,
        destinationProximity:
          decay(destinationDistanceKm, cfg.maxDestinationRadiusKm) *
          cfg.weights.destinationProximity,
        timeDifference:
          decay(timeDifferenceMinutes, cfg.maxTimeToleranceMinutes) *
          cfg.weights.timeDifference,
        reliability: (c.driverReliability / 100) * cfg.weights.reliability,
        rating: (c.driverRating / 5) * cfg.weights.rating,
      };

      const score = Object.values(breakdown).reduce((a, b) => a + b, 0);

      return {
        candidate: c,
        score,
        originDistanceKm,
        destinationDistanceKm,
        timeDifferenceMinutes,
        breakdown,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.candidate.date.localeCompare(b.candidate.date) ||
        a.candidate.departureTime.localeCompare(b.candidate.departureTime) ||
        a.candidate.rideId.localeCompare(b.candidate.rideId),
    );
}
