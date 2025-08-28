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
  // 存在チェックのみ実行（配置済みチェックを削除して移動を許可）
  const base = ensureExists(piece);
  if (base.isErr()) return err(base.error);
  if (!Number.isInteger(row) || row < 0 || row > 4 || !Number.isInteger(col) || col < 0 || col > 4) {
    return err('invalidCell');
  }
  const p = base.value;
  // 新要件: 任意の位置への配置を許可（正解判定はスコア計算時に行う）
  // 配置済みピースの移動も許可
  return ok(p);
}

// 正解位置判定用の新しい関数
export function isCorrectPosition(piece: Piece, row: number, col: number): boolean {
  return piece.solRow !== undefined && piece.solCol !== undefined && 
         piece.solRow === row && piece.solCol === col;
}
