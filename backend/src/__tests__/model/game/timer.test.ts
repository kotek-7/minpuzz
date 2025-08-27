import { remainingMs } from '../../../model/game/timer.js';

describe('timer.remainingMs', () => {
  test('returns 0 for null timer', () => {
    const now = new Date().toISOString();
    expect(remainingMs(now, null)).toBe(0);
  });

  test('calculates remaining correctly and clamps negative to 0', () => {
    const now = new Date();
    const started = new Date(now.getTime() - 30_000).toISOString(); // 30s ago
    const nowIso = now.toISOString();
    expect(remainingMs(nowIso, { startedAt: started, durationMs: 60_000 })).toBeGreaterThanOrEqual(29_000);
    expect(remainingMs(nowIso, { startedAt: started, durationMs: 60_000 })).toBeLessThanOrEqual(31_000);

    const startedLongAgo = new Date(now.getTime() - 120_000).toISOString(); // 120s ago
    expect(remainingMs(nowIso, { startedAt: startedLongAgo, durationMs: 60_000 })).toBe(0);
  });
});

