import { z } from "zod";

export const PieceSchema = z.object({
  id: z.string().min(1),
  placed: z.boolean(),
  row: z.number().int().nonnegative().optional(),
  col: z.number().int().nonnegative().optional(),
  solRow: z.number().int().nonnegative().optional(),
  solCol: z.number().int().nonnegative().optional(),
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

// ドラッグ系イベントスキーマは撤去（クリック配置に非対応のため）

// M4: piece-place schemas
export const PiecePlacePayloadSchema = z.object({
  matchId: z.string().min(1),
  teamId: z.string().min(1),
  userId: z.string().min(1),
  pieceId: z.string().min(1),
  // クリック配置: 盤面は5x5固定のため 0..4 に制限
  row: z.number().int().min(0).max(4),
  col: z.number().int().min(0).max(4),
});

export const PiecePlacedPayloadSchema = z.object({
  pieceId: z.string().min(1),
  row: z.number().int().min(0).max(4),
  col: z.number().int().min(0).max(4),
  byUserId: z.string().min(1),
});

export type PiecePlacePayload = z.infer<typeof PiecePlacePayloadSchema>;
export type PiecePlacedPayload = z.infer<typeof PiecePlacedPayloadSchema>;

export const PiecePlaceDeniedPayloadSchema = z.object({
  pieceId: z.string().min(1),
  reason: z.enum(['notFound', 'placed', 'invalidCell']),
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
