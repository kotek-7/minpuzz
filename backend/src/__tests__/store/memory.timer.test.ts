import { describe, expect, test } from '@jest/globals';
import { InMemoryGameStore } from '../../repository/gameStore.memory.js';

describe('InMemoryGameStore - timer', () => {
  test('getTimer returns null when unset', async () => {
    const store = new InMemoryGameStore();
    const t = await store.getTimer('m1');
    expect(t.isOk() && t.value === null).toBe(true);
  });

  test('setTimer then getTimer round-trips', async () => {
    const store = new InMemoryGameStore();
    const timer = { startedAt: new Date().toISOString(), durationMs: 120000 };
    const set = await store.setTimer('m1', timer);
    expect(set.isOk()).toBe(true);
    const got = await store.getTimer('m1');
    expect(got.isOk() && JSON.stringify(got.value) === JSON.stringify(timer)).toBe(true);
  });
});

