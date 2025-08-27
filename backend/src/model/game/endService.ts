import { err, ok, Result } from 'neverthrow';
import type { GameStore } from '../../repository/gameStore.js';
import type { MatchRecord, Piece } from './types.js';

export type EndCheckError = 'io' | 'invalid';

export async function checkAllPlaced(store: GameStore, matchId: string): Promise<Result<boolean, EndCheckError>> {
  const list = await store.listPieces(matchId);
  if (list.isErr()) return err('io');
  const pieces: Piece[] = list.value;
  return ok(pieces.every((p) => p.placed === true));
}

export async function completeMatchIfNeeded(
  store: GameStore,
  matchId: string
): Promise<Result<{ completed: boolean; match?: MatchRecord }, EndCheckError>> {
  const allPlaced = await checkAllPlaced(store, matchId);
  if (allPlaced.isErr()) return err(allPlaced.error);
  if (!allPlaced.value) return ok({ completed: false });

  const cur = await store.getMatch(matchId);
  if (cur.isErr()) return err('io');
  const m = cur.value;
  if (!m) return ok({ completed: false });
  if (m.status === 'COMPLETED') return ok({ completed: false, match: m });
  const next: MatchRecord = { ...m, status: 'COMPLETED' };
  const set = await store.setMatch(matchId, next);
  if (set.isErr()) return err('io');
  return ok({ completed: true, match: next });
}

