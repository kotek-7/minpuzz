import { PiecePlacePayloadSchema, PiecePlacedPayloadSchema } from '../../../model/game/schemas.js';

describe('schema: piece-place', () => {
  test('valid payload parses', () => {
    const payload = {
      matchId: 'm1', teamId: 't1', userId: 'u1', pieceId: 'p1',
      row: 0, col: 1,
    };
    expect(() => PiecePlacePayloadSchema.parse(payload)).not.toThrow();
  });

  test('invalid row/col rejected', () => {
    const bad = {
      matchId: 'm1', teamId: 't1', userId: 'u1', pieceId: 'p1',
      row: -1, col: 1,
    };
    expect(() => PiecePlacePayloadSchema.parse(bad)).toThrow();
  });

  test('placed payload shape', () => {
    const out = { pieceId: 'p1', row: 0, col: 0, byUserId: 'u1' };
    expect(() => PiecePlacedPayloadSchema.parse(out)).not.toThrow();
  });
});
