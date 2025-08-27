import { defaultGeometry, cellCenter } from '../../../model/game/geometry.js';
import { canPlace } from '../../../model/game/pieceGuards.js';
import type { Piece } from '../../../model/game/types.js';

describe('geometry snap tolerance with canPlace', () => {
  const piece: Piece = { id: 'p', x: 0, y: 0, placed: false, holder: 'u1', solRow: 0, solCol: 0 };
  const row = 0, col = 0;
  const center = cellCenter(defaultGeometry, row, col);

  test('inside tolerance passes', () => {
    const x = center.x + defaultGeometry.snapTolerancePx - 0.5;
    const y = center.y;
    const r = canPlace(piece, 'u1', row, col, x, y);
    expect(r.isOk()).toBe(true);
  });

  test('exact center passes', () => {
    const r = canPlace(piece, 'u1', row, col, center.x, center.y);
    expect(r.isOk()).toBe(true);
  });

  test('just outside tolerance fails', () => {
    const x = center.x + defaultGeometry.snapTolerancePx + 0.5;
    const y = center.y;
    const r = canPlace(piece, 'u1', row, col, x, y);
    expect(r.isErr() && r.error === 'invalidCell').toBe(true);
  });
});

