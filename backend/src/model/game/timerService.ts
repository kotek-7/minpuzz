import { ok, err, Result } from 'neverthrow';
import type { GameStore } from '../../repository/gameStore.js';
import { remainingMs } from './timer.js';
import { SOCKET_EVENTS, type TimerSyncPayload } from '../../socket/events.js';
import { completeMatchIfNeeded } from './endService.js';
import type { MatchRecord } from './types.js';

export type TickError = 'io' | 'invalid';

export interface IoLike {
  to(room: string): { emit: (event: string, payload: unknown) => unknown };
}

export async function tick(
  io: IoLike,
  store: GameStore,
  matchId: string,
  nowIso: string
): Promise<Result<'synced' | 'timeout', TickError>> {
  const t = await store.getTimer(matchId);
  if (t.isErr()) {
    // 異常時はスキップ（送出しない）
    return ok('synced');
  }
  const timer = t.value;
  if (!timer) {
    // 未設定時はスキップ（送出しない）
    return ok('synced');
  }
  const remaining = remainingMs(nowIso, timer);

  const payload: TimerSyncPayload = {
    nowIso,
    startedAt: timer.startedAt,
    durationMs: timer.durationMs,
    remainingMs: remaining,
  };
  io.to(`room:match:${matchId}:public`).emit(SOCKET_EVENTS.TIMER_SYNC, payload);

  if (remaining <= 0) {
    // 既にCOMPLETEDなら多重送出しない
    const cur = await store.getMatch(matchId);
    if (cur.isErr()) return err('io');
    const m = cur.value;
    if (!m) return err('invalid');
    if (m.status !== 'COMPLETED') {
      const next: MatchRecord = { ...m, status: 'COMPLETED' };
      const set = await store.setMatch(matchId, next);
      if (set.isErr()) return err('io');
    }
    // winner（最大値）を計算（同点はnull）
    const scoreNow = await store.getScore(matchId);
    let winnerTeamId: string | null = null;
    if (scoreNow.isOk()) {
      const entries = Object.entries(scoreNow.value.placedByTeam);
      if (entries.length > 0) {
        entries.sort((a, b) => b[1] - a[1]);
        if (entries.length >= 2 && entries[0][1] === entries[1][1]) {
          winnerTeamId = null;
        } else {
          winnerTeamId = entries[0][0];
        }
      }
    }
    io.to(`room:match:${matchId}:public`).emit(SOCKET_EVENTS.GAME_END, {
      reason: 'timeout',
      winnerTeamId,
      scores: scoreNow.isOk() ? scoreNow.value.placedByTeam : {},
      finishedAt: nowIso,
    });
    return ok('timeout');
  }
  return ok('synced');
}
