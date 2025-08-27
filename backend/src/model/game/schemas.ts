import { z } from "zod";

export const PieceSchema = z.object({
  id: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  placed: z.boolean(),
  row: z.number().int().nonnegative().optional(),
  col: z.number().int().nonnegative().optional(),
  holder: z.string().min(1).optional(),
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

