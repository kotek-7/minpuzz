import type { Timer } from './types.js';

// 純粋: 現在時刻とタイマー情報から残り時間(ms)を計算（負値は0に丸め）
export function remainingMs(nowIso: string, timer: Timer | null): number {
  if (!timer) return 0;
  const now = Date.parse(nowIso);
  const started = Date.parse(timer.startedAt);
  if (Number.isNaN(now) || Number.isNaN(started)) return 0;
  const elapsed = Math.max(0, now - started);
  const remain = Math.max(0, timer.durationMs - elapsed);
  return remain;
}

