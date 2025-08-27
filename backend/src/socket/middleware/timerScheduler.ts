import type { IoLike } from '../../model/game/timerService.js';
import type { GameStore } from '../../repository/gameStore.js';
import { tick } from '../../model/game/timerService.js';

export type IntervalLike = ReturnType<typeof setInterval>;

export function createTimerScheduler(
  io: IoLike,
  store: GameStore,
  intervalMs: number = 5000
) {
  const timers = new Map<string, IntervalLike>();

  return {
    start(matchId: string) {
      if (timers.has(matchId)) return; // 冪等
      const h = setInterval(async () => {
        try {
          const nowIso = new Date().toISOString();
          const res = await tick(io, store, matchId, nowIso);
          if (res.isOk() && res.value === 'timeout') {
            this.stop(matchId);
          }
        } catch {
          // noop: 送出失敗等は次tickに任せる
        }
      }, intervalMs);
      timers.set(matchId, h);
    },
    stop(matchId: string) {
      const h = timers.get(matchId);
      if (h) {
        clearInterval(h);
        timers.delete(matchId);
      }
    },
  };
}

