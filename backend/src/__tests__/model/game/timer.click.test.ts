
import { remainingMs } from '../../../model/game/timer.js';

describe('timer (click)', () => {
  test('remainingMs clamps to 0 and handles valid inputs', () => {
    const now = new Date();
    const startedAt = new Date(now.getTime() - 30_000).toISOString();
    const r1 = remainingMs(now.toISOString(), { startedAt, durationMs: 60_000 });
    expect(r1).toBeGreaterThan(20_000);
    const startedLongAgo = new Date(now.getTime() - 120_000).toISOString();
    const r2 = remainingMs(now.toISOString(), { startedAt: startedLongAgo, durationMs: 60_000 });
    expect(r2).toBe(0);
  });
});

