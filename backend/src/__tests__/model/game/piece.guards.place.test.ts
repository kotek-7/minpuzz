import { canPlace } from '../../../model/game/pieceGuards.js';
import type { Piece } from '../../../model/game/types.js';

describe('pieceGuards.canPlace', () => {
  const base: Piece = { id: 'p', x: 0, y: 0, placed: false, holder: 'u1' };

  test('notFound when piece is null', () => {
    const r = canPlace(null, 'u1', 0, 0);
    expect(r.isErr() && r.error === 'notFound').toBe(true);
  });

  test('rejects already placed', () => {
    const r = canPlace({ ...base, placed: true }, 'u1', 0, 0);
    expect(r.isErr() && r.error === 'placed').toBe(true);
  });

  test('rejects non-holder', () => {
    const r = canPlace(base, 'u2', 0, 0);
    expect(r.isErr() && r.error === 'notHolder').toBe(true);
  });

  test('invalid cell', () => {
    const r = canPlace(base, 'u1', -1, 0);
    expect(r.isErr() && r.error === 'invalidCell').toBe(true);
  });

  test('ok for valid inputs', () => {
    const r = canPlace(base, 'u1', 2, 3);
    expect(r.isOk()).toBe(true);
  });
});

