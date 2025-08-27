import { describe, expect, test } from '@jest/globals';
import { InMemoryGameStore } from '../../repository/gameStore.memory.js';

describe('InMemoryGameStore - score', () => {
  test('getScore returns 0 for unset teams', async () => {
    const store = new InMemoryGameStore();
    const s = await store.getScore('m1');
    expect(s.isOk()).toBe(true);
    if (s.isOk()) {
      expect(s.value.placedByTeam['t1']).toBeUndefined();
    }
  });

  test('incrTeamPlaced increments and returns new value', async () => {
    const store = new InMemoryGameStore();
    const n1 = await store.incrTeamPlaced('m1', 't1');
    const n2 = await store.incrTeamPlaced('m1', 't1');
    expect(n1.isOk() && n1.value === 1).toBe(true);
    expect(n2.isOk() && n2.value === 2).toBe(true);
    const s = await store.getScore('m1');
    if (s.isOk()) expect(s.value.placedByTeam['t1']).toBe(2);
  });

  test('setPlaced sets explicit value', async () => {
    const store = new InMemoryGameStore();
    const r = await store.setPlaced('m1', 't2', 5);
    expect(r.isOk() && r.value === 5).toBe(true);
    const s = await store.getScore('m1');
    if (s.isOk()) expect(s.value.placedByTeam['t2']).toBe(5);
  });
});

