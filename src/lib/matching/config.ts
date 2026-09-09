/**
 * Single source of truth for matching thresholds and ranking weights.
 * Deterministic, no AI/ML. Tune here only.
 */
export const MATCHING_CONFIG = {
  /** Hard filters */
  maxOriginRadiusKm: 6,
  maxDestinationRadiusKm: 6,
  maxTimeToleranceMinutes: 45,

  /** Ranking weights (higher = more influence). Scores are 0..1 before weighting. */
  weights: {
    routeSimilarity: 0.3,
    originProximity: 0.2,
    destinationProximity: 0.2,
    timeDifference: 0.15,
    reliability: 0.1,
    rating: 0.05,
  },
} as const;

export type MatchingConfig = typeof MATCHING_CONFIG;
