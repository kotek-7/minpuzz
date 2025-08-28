export const MATCHING_EVENTS = {
  JOIN_MATCHING_QUEUE: "join-matching-queue",
  NAVIGATE_TO_MATCHING: "navigate-to-matching",
  MATCH_FOUND: "match-found",
} as const;

export type MatchingSocketEvent = typeof MATCHING_EVENTS[keyof typeof MATCHING_EVENTS];

