import { GameInitPayloadSchema, buildInitPayload } from '../../../model/game/init.js';

describe('model/game/init.buildInitPayload', () => {
  it('builds a valid dummy init payload', () => {
    const payload = buildInitPayload({ matchId: 'm1', teamId: 't1', userId: 'u1' });
    const parsed = GameInitPayloadSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.board.rows).toBeGreaterThan(0);
      expect(parsed.data.board.cols).toBeGreaterThan(0);
      expect(Array.isArray(parsed.data.pieces)).toBe(true);
    }
  });
});

