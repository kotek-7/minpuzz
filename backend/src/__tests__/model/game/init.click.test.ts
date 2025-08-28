import { describe, test, expect } from '@jest/globals';
import { buildInitPayload, buildInitPayloadWithTimer, GameInitPayloadSchema } from '../../../model/game/init.js';

describe('init (click, 5x5)', () => {
  test('buildInitPayload returns 5x5 board with empty pieces', () => {
    const p = buildInitPayload({ matchId: 'm1', teamId: 't1', userId: 'u1' });
    expect(p.board.rows).toBe(5);
    expect(p.board.cols).toBe(5);
    expect(Array.isArray(p.pieces) && p.pieces.length === 0).toBe(true);
    // schema check
    expect(() => GameInitPayloadSchema.parse(p)).not.toThrow();
  });

  test('buildInitPayloadWithTimer propagates timer when provided', () => {
    const timer = { startedAt: new Date().toISOString(), durationMs: 120000 };
    const p = buildInitPayloadWithTimer({ matchId: 'm1', teamId: 't1', userId: 'u1' }, timer);
    expect(p.board.rows).toBe(5);
    expect(p.startedAt).toBe(timer.startedAt);
    expect(p.durationMs).toBe(timer.durationMs);
  });
});

