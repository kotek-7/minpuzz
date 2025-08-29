import { z } from "zod";

export const PieceSchema = z.object({
  id: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  placed: z.boolean(),
  row: z.number().int().nonnegative().optional(),
  col: z.number().int().nonnegative().optional(),
  holder: z.string().min(1).optional(),
  solRow: z.number().int().nonnegative().optional(),
  solCol: z.number().int().nonnegative().optional(),
  season: z.enum(['spring', 'summer', 'autumn', 'winter']).optional(),
}).refine(
  (p) => (p.placed ? p.row !== undefined && p.col !== undefined : true),
  { message: "placed=true の場合は row/col が必須" }
);

export const ScoreSchema = z.object({
  placedByTeam: z.record(z.string(), z.number().int().nonnegative()),
});

export const TimerSchema = z.object({
  startedAt: z.string(), // ISO想定（厳格チェックは必要に応じて）
  durationMs: z.number().int().positive(),
});

export type PieceInput = z.infer<typeof PieceSchema>;
export type ScoreInput = z.infer<typeof ScoreSchema>;
export type TimerInput = z.infer<typeof TimerSchema>;

// M3: Event payload schemas
export const PieceGrabPayloadSchema = z.object({
  matchId: z.string().min(1),
  teamId: z.string().min(1),
  userId: z.string().min(1),
  pieceId: z.string().min(1),
});

export const PieceGrabbedPayloadSchema = z.object({
  pieceId: z.string().min(1),
  byUserId: z.string().min(1),
});

export const PieceGrabDeniedPayloadSchema = z.object({
  pieceId: z.string().min(1),
  reason: z.enum(['locked', 'placed', 'notFound']),
});

export const PieceMovePayloadSchema = z.object({
  matchId: z.string().min(1),
  teamId: z.string().min(1),
  userId: z.string().min(1),
  pieceId: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  ts: z.number().int().nonnegative(),
});

export const PieceMovedPayloadSchema = z.object({
  pieceId: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  byUserId: z.string().min(1),
  ts: z.number().int().nonnegative(),
});

export const PieceReleasePayloadSchema = z.object({
  matchId: z.string().min(1),
  teamId: z.string().min(1),
  userId: z.string().min(1),
  pieceId: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
});

export const PieceReleasedPayloadSchema = z.object({
  pieceId: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  byUserId: z.string().min(1),
});

export type PieceGrabPayload = z.infer<typeof PieceGrabPayloadSchema>;
export type PieceGrabbedPayload = z.infer<typeof PieceGrabbedPayloadSchema>;
export type PieceGrabDeniedPayload = z.infer<typeof PieceGrabDeniedPayloadSchema>;
export type PieceMovePayload = z.infer<typeof PieceMovePayloadSchema>;
export type PieceMovedPayload = z.infer<typeof PieceMovedPayloadSchema>;
export type PieceReleasePayload = z.infer<typeof PieceReleasePayloadSchema>;
export type PieceReleasedPayload = z.infer<typeof PieceReleasedPayloadSchema>;

// M4: piece-place schemas
export const PiecePlacePayloadSchema = z.object({
  matchId: z.string().min(1),
  teamId: z.string().min(1),
  userId: z.string().min(1),
  pieceId: z.string().min(1),
  row: z.number().int().nonnegative(),
  col: z.number().int().nonnegative(),
  x: z.number().finite(),
  y: z.number().finite(),
});

export const PiecePlacedPayloadSchema = z.object({
  pieceId: z.string().min(1),
  row: z.number().int().nonnegative(),
  col: z.number().int().nonnegative(),
  byUserId: z.string().min(1),
});

export type PiecePlacePayload = z.infer<typeof PiecePlacePayloadSchema>;
export type PiecePlacedPayload = z.infer<typeof PiecePlacedPayloadSchema>;

export const PiecePlaceDeniedPayloadSchema = z.object({
  pieceId: z.string().min(1),
  reason: z.enum(['notFound', 'placed', 'notHolder', 'invalidCell']),
});
export type PiecePlaceDeniedPayload = z.infer<typeof PiecePlaceDeniedPayloadSchema>;

// M5: timer-sync payload schema
export const TimerSyncPayloadSchema = z.object({
  nowIso: z.string(),
  startedAt: z.string().nullable(),
  durationMs: z.number().int().positive().nullable(),
  remainingMs: z.number().int().nonnegative(),
});
export type TimerSyncPayload = z.infer<typeof TimerSyncPayloadSchema>;

// M6: state sync schemas
export const RequestGameInitPayloadSchema = z.object({
  matchId: z.string().min(1),
  teamId: z.string().min(1),
  userId: z.string().min(1),
});

export const StateSyncPayloadSchema = z.object({
  board: z.object({ rows: z.number().int().positive(), cols: z.number().int().positive() }),
  pieces: z.array(PieceSchema),
  score: ScoreSchema,
  timer: TimerSchema.nullable(),
  matchStatus: z.string(),
});

export type RequestGameInitPayload = z.infer<typeof RequestGameInitPayloadSchema>;
export type StateSyncPayload = z.infer<typeof StateSyncPayloadSchema>;
