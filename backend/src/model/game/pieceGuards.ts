import { err, ok, Result } from 'neverthrow';
import type { Piece } from './types.js';
export type GuardError = 'notFound' | 'placed';
export type PlaceCheckError = GuardError | 'invalidCell';

export function ensureExists(piece: Piece | null): Result<Piece, GuardError> {
  if (!piece) return err('notFound');
  return ok(piece);
}

export function ensureNotPlaced(piece: Piece): Result<Piece, GuardError> {
  if (piece.placed) return err('placed');
  return ok(piece);
}

// クリック配置では自由座標を保持しないため位置更新は不要

export function canPlace(
  piece: Piece | null,
  row: number,
  col: number,
): Result<Piece, PlaceCheckError> {
  const base = ensureExists(piece).andThen(ensureNotPlaced);
  if (base.isErr()) return err(base.error);
  if (!Number.isInteger(row) || row < 0 || row > 4 || !Number.isInteger(col) || col < 0 || col > 4) {
    return err('invalidCell');
  }
  const p = base.value;
  // 正解セル判定（solRow/solCol一致が設定されている場合のみ適用）
  if (p.solRow !== undefined && p.solCol !== undefined) {
    if (p.solRow !== row || p.solCol !== col) return err('invalidCell');
  }
  return ok(p);
}
