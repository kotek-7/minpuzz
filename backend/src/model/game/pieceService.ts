import { err, ok, Result } from 'neverthrow';
import type { GameStore, StoreError } from '../../repository/gameStore.js';
import type { Piece } from './types.js';
import { canPlace, ensureExists, ensureHolder, ensureNotPlaced, withHolder, withPosition } from './pieceGuards.js';

export type GrabError = 'notFound' | 'placed' | 'locked' | 'io';
export type MoveError = 'notFound' | 'placed' | 'notHolder' | 'io';
export type ReleaseError = 'notFound' | 'placed' | 'notHolder' | 'io';
export type PlaceError = 'notFound' | 'placed' | 'notHolder' | 'invalidCell' | 'io';

export async function grab(
  store: GameStore,
  params: { matchId: string; pieceId: string; userId: string; lockTtlSec: number }
): Promise<Result<{ pieceId: string }, GrabError>> {
  const pieceRes = await store.getPiece(params.matchId, params.pieceId);
  if (pieceRes.isErr()) return err('io');
  const p0Res = ensureExists(pieceRes.value);
  if (p0Res.isErr()) {
    // 'notFound' のみが来る（grabでは 'notHolder' は発生しない）
    return err('notFound');
  }

  // Acquire lock
  const lock = await store.acquirePieceLock(params.matchId, params.pieceId, params.userId, params.lockTtlSec);
  if (lock.isErr()) {
    if (lock.error === 'conflict') return err('locked');
    return err('io');
  }
  // persist holder and reset placed state if piece was placed
  const updated = withHolder(p0Res.value, params.userId);
  // 配置済みピースを掴んだ場合は配置状態をリセット
  if (updated.placed) {
    updated.placed = false;
    updated.row = undefined;
    updated.col = undefined;
  }
  const setRes = await store.setPiece(params.matchId, updated);
  if (setRes.isErr()) return err('io');
  return ok({ pieceId: params.pieceId });
}

export async function move(
  store: GameStore,
  params: { matchId: string; pieceId: string; userId: string; x: number; y: number; ts: number }
): Promise<Result<Piece, MoveError>> {
  const pieceRes = await store.getPiece(params.matchId, params.pieceId);
  if (pieceRes.isErr()) return err('io');
  const guarded = ensureExists(pieceRes.value)
    .andThen((p) => ensureHolder(p, params.userId));
  if (guarded.isErr()) return err(guarded.error);
  const next = withPosition(guarded.value, params.x, params.y);
  const set = await store.setPiece(params.matchId, next);
  if (set.isErr()) return err('io');
  return ok(next);
}

export async function release(
  store: GameStore,
  params: { matchId: string; pieceId: string; userId: string; x: number; y: number }
): Promise<Result<Piece, ReleaseError>> {
  const pieceRes = await store.getPiece(params.matchId, params.pieceId);
  if (pieceRes.isErr()) return err('io');
  const guarded = ensureExists(pieceRes.value)
    .andThen((p) => ensureHolder(p, params.userId));
  if (guarded.isErr()) return err(guarded.error);
  const next = withHolder(withPosition(guarded.value, params.x, params.y), undefined);
  const set = await store.setPiece(params.matchId, next);
  if (set.isErr()) return err('io');
  const rel = await store.releasePieceLock(params.matchId, params.pieceId, params.userId);
  if (rel.isErr()) return err(rel.error === 'conflict' ? 'notHolder' : 'io');
  return ok(next);
}

export async function place(
  store: GameStore,
  params: { matchId: string; pieceId: string; userId: string; row: number; col: number; x: number; y: number }
): Promise<Result<Piece, PlaceError>> {
  const pieceRes = await store.getPiece(params.matchId, params.pieceId);
  if (pieceRes.isErr()) return err('io');
  const guarded = canPlace(pieceRes.value, params.userId, params.row, params.col);
  if (guarded.isErr()) return err(guarded.error);
  const next: Piece = { ...guarded.value, x: params.x, y: params.y, placed: true, row: params.row, col: params.col };
  const set = await store.setPiece(params.matchId, next);
  if (set.isErr()) return err('io');
  const rel = await store.releasePieceLock(params.matchId, params.pieceId, params.userId);
  if (rel.isErr()) return err(rel.error === 'conflict' ? 'notHolder' : 'io');
  return ok(next);
}
