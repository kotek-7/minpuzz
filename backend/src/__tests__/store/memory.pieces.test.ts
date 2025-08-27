import { describe, expect, test } from '@jest/globals';
import { InMemoryGameStore } from '../../repository/gameStore.memory.js';

describe('InMemoryGameStore - pieces', () => {
  test('set/get/list pieces round-trip', async () => {
    const store = new InMemoryGameStore();
    const matchId = 'm1';

    const p1 = { id: 'p1', x: 10, y: 20, placed: false };
    const p2 = { id: 'p2', x: 30, y: 40, placed: true, row: 1, col: 2 };

    expect((await store.setPiece(matchId, p1)).isOk()).toBe(true);
    expect((await store.setPiece(matchId, p2)).isOk()).toBe(true);

    const got1 = await store.getPiece(matchId, 'p1');
    const got2 = await store.getPiece(matchId, 'p2');
    const gotX = await store.getPiece(matchId, 'px');

    expect(got1.isOk() && got1.value?.id === 'p1').toBe(true);
    expect(got2.isOk() && got2.value?.row === 1 && got2.value?.col === 2).toBe(true);
    expect(gotX.isOk() && gotX.value === null).toBe(true);

    const list = await store.listPieces(matchId);
    expect(list.isOk()).toBe(true);
    if (list.isOk()) {
      const ids = list.value.map(p => p.id).sort();
      expect(ids).toEqual(['p1', 'p2']);
    }
  });

  test('reject invalid placed piece without row/col', async () => {
    const store = new InMemoryGameStore();
    const res = await store.setPiece('m1', { id: 'p1', x: 0, y: 0, placed: true });
    expect(res.isErr()).toBe(true);
  });
});

