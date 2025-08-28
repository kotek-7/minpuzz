import { err, ok, Result } from 'neverthrow';
import type { GameStore, StoreError } from '../../repository/gameStore.js';
import type { Piece } from './types.js';
import { canPlace, ensureExists, ensureNotPlaced, withPosition } from './pieceGuards.js';

export type GrabError = 'notFound' | 'placed' | 'locked' | 'io';
export type MoveError = 'notFound' | 'placed' | 'notHolder' | 'io';
export type ReleaseError = 'notFound' | 'placed' | 'notHolder' | 'io';
export type PlaceError = 'notFound' | 'placed' | 'invalidCell' | 'io';

export async function grab(
  store: GameStore,
  params: { matchId: string; pieceId: string; userId: string; lockTtlSec: number }
): Promise<Result<{ pieceId: string }, GrabError>> {
  const pieceRes = await store.getPiece(params.matchId, params.pieceId);
  if (pieceRes.isErr()) return err('io');
  const p0Res = ensureExists(pieceRes.value).andThen(ensureNotPlaced);
  if (p0Res.isErr()) {
    // 'notFound' | 'placed' のみが来る（grabでは 'notHolder' は発生しない）
    if (p0Res.error === 'notFound') return err('notFound');
    return err('placed');
  }

  // Acquire lock
  const lock = await store.acquirePieceLock(params.matchId, params.pieceId, params.userId, params.lockTtlSec);
  if (lock.isErr()) {
    if (lock.error === 'conflict') return err('locked');
    return err('io');
  }
  // persist holder
  const updated = withHolder(p0Res.value, params.userId);
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
    .andThen(ensureNotPlaced)
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
    .andThen(ensureNotPlaced)
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
  // クリック配置版: holder/lock なし、セル占有チェックのみ
  const pieceRes = await store.getPiece(params.matchId, params.pieceId);
  if (pieceRes.isErr()) return err('io');
  const guarded = canPlace(pieceRes.value, params.row, params.col);
  if (guarded.isErr()) return err(guarded.error);

  // セル占有チェック（同一row/colの配置済みピースが存在しないこと）
  const listR = await store.listPieces(params.matchId);
  if (listR.isErr()) return err('io');
  const occupied = listR.value.some((p) => p.placed && p.row === params.row && p.col === params.col);
  if (occupied) return err('invalidCell');

  const next: Piece = { ...guarded.value, placed: true, row: params.row, col: params.col };
  const setR = await store.setPiece(params.matchId, next);
  if (setR.isErr()) return err('io');
  return ok(next);
}
