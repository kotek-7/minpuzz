
import {
  PiecePlacePayloadSchema,
  RequestGameInitPayloadSchema,
} from '../../../model/game/schemas.js';

describe('schemas (click placement)', () => {
  test('piece-place payload: valid row/col', () => {
    const ok = PiecePlacePayloadSchema.safeParse({
      matchId: 'm1',
      teamId: 't1',
      userId: 'u1',
      pieceId: 'p1',
      row: 0,
      col: 4,
      x: 0, // legacy fields tolerated by schema? ensure absence does not fail
      y: 0,
    } as any);
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.row).toBe(0);
      expect(ok.data.col).toBe(4);
    }
  });

  test('piece-place payload: rejects out-of-range row/col', () => {
    const badRow = PiecePlacePayloadSchema.safeParse({
      matchId: 'm1', teamId: 't1', userId: 'u1', pieceId: 'p1', row: -1, col: 0,
    });
    const badCol = PiecePlacePayloadSchema.safeParse({
      matchId: 'm1', teamId: 't1', userId: 'u1', pieceId: 'p1', row: 0, col: 999,
    });
    expect(badRow.success).toBe(false);
    expect(badCol.success).toBe(false);
  });

  test('request-game-init payload: minimal fields', () => {
    const ok = RequestGameInitPayloadSchema.safeParse({ matchId: 'm1', teamId: 't1', userId: 'u1' });
    expect(ok.success).toBe(true);
  });
});

