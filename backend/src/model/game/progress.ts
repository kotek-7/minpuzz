import { err, ok, Result } from 'neverthrow';
import type { GameStore } from '../../repository/gameStore.js';
import type { Score } from './types.js';

export type ProgressError = 'io' | 'invalid';

export async function incrementTeamPlacedAndGetScore(
  store: GameStore,
  params: { matchId: string; teamId: string }
): Promise<Result<Score, ProgressError>> {
  const inc = await store.incrTeamPlaced(params.matchId, params.teamId);
  if (inc.isErr()) return err('io');
  const get = await store.getScore(params.matchId);
  if (get.isErr()) return err('io');
  return ok(get.value);
}

