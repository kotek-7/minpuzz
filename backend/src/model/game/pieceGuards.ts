import { err, ok, Result } from 'neverthrow';
import type { Piece } from './types.js';

export type GuardError = 'notFound' | 'placed' | 'notHolder';
export type PlaceCheckError = GuardError | 'invalidCell';

export function ensureExists(piece: Piece | null): Result<Piece, GuardError> {
  if (!piece) return err('notFound');
  return ok(piece);
}

export function ensureNotPlaced(piece: Piece): Result<Piece, GuardError> {
  if (piece.placed) return err('placed');
  return ok(piece);
}

export function ensureHolder(piece: Piece, userId: string): Result<Piece, GuardError> {
  if (piece.holder !== userId) return err('notHolder');
  return ok(piece);
}

export function withPosition(piece: Piece, x: number, y: number): Piece {
  return { ...piece, x, y };
}

export function withHolder(piece: Piece, userId: string | undefined): Piece {
  const p = { ...piece } as Piece;
  if (userId === undefined) {
    delete (p as any).holder;
    return p;
  }
  return { ...piece, holder: userId };
}

export function canPlace(
  piece: Piece | null,
  userId: string,
  row: number,
  col: number
): Result<Piece, PlaceCheckError> {
  const base = ensureExists(piece).andThen(ensureNotPlaced).andThen((p) => ensureHolder(p, userId));
  if (base.isErr()) return err(base.error);
  if (!Number.isInteger(row) || row < 0 || !Number.isInteger(col) || col < 0) return err('invalidCell');
  return ok(base.value);
}
