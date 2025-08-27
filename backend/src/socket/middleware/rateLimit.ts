export type NowFn = () => number;

export interface EventThrottler {
  shouldAllow(key: string, nowMs?: number): boolean;
}

export function createThrottler(minIntervalMs: number, now: NowFn = () => Date.now()): EventThrottler {
  const lastMap = new Map<string, number>();
  return {
    shouldAllow(key: string, nowMs?: number): boolean {
      const t = nowMs ?? now();
      const last = lastMap.get(key) ?? -Infinity;
      if (t - last < minIntervalMs) return false;
      lastMap.set(key, t);
      return true;
    },
  };
}

