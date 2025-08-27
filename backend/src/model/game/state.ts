import { ok, err, Result } from 'neverthrow';
import type { GameStore } from '../../repository/gameStore.js';
import type { Piece, Score, Timer } from './types.js';

export type StateSnapshot = {
  board: { rows: number; cols: number };
  pieces: Piece[];
  score: Score;
  timer: Timer | null;
  matchStatus: string;
};

export async function buildStateSnapshot(store: GameStore, matchId: string): Promise<Result<StateSnapshot, 'io'>> {
  const [piecesR, scoreR, timerR, matchR] = await Promise.all([
    store.listPieces(matchId),
    store.getScore(matchId),
    store.getTimer(matchId),
    store.getMatch(matchId),
  ]);

  if (piecesR.isErr() || scoreR.isErr() || timerR.isErr() || matchR.isErr()) return err('io');
  const pieces = piecesR.value ?? [];
  const score = scoreR.value ?? { placedByTeam: {} };
  const timer = timerR.value ?? null;
  const match = matchR.value ?? null;

  return ok({
    board: { rows: 6, cols: 6 },
    pieces,
    score,
    timer,
    matchStatus: match ? match.status : 'UNKNOWN',
  });
}

