import { z } from "zod";

export const GameInitPayloadSchema = z.object({
  matchId: z.string(),
  teamId: z.string(),
  userId: z.string(),
  board: z.object({ rows: z.number().int().positive(), cols: z.number().int().positive() }),
  pieces: z.array(
    z.object({
      id: z.string(),
      x: z.number(),
      y: z.number(),
      placed: z.boolean(),
      row: z.number().int().nonnegative().optional(),
      col: z.number().int().nonnegative().optional(),
    })
  ),
  startedAt: z.string().nullable(),
  durationMs: z.number().int().positive().nullable(),
});

export type GameInitPayload = z.infer<typeof GameInitPayloadSchema>;

// M1: 仕様に基づくダミー初期化データ（固定の6x6、ピースなし）
export function buildInitPayload(params: { matchId: string; teamId: string; userId: string }): GameInitPayload {
  const payload: GameInitPayload = {
    matchId: params.matchId,
    teamId: params.teamId,
    userId: params.userId,
    board: { rows: 6, cols: 6 },
    pieces: [],
    startedAt: null,
    durationMs: null,
  };
  // 型安全チェック（開発時の保険）
  GameInitPayloadSchema.parse(payload);
  return payload;
}

// M5: タイマー情報を反映した初期化データ
export function buildInitPayloadWithTimer(
  params: { matchId: string; teamId: string; userId: string },
  timer: { startedAt: string; durationMs: number } | null
): GameInitPayload {
  const payload: GameInitPayload = {
    matchId: params.matchId,
    teamId: params.teamId,
    userId: params.userId,
    board: { rows: 6, cols: 6 },
    pieces: [],
    startedAt: timer ? timer.startedAt : null,
    durationMs: timer ? timer.durationMs : null,
  };
  GameInitPayloadSchema.parse(payload);
  return payload;
}
