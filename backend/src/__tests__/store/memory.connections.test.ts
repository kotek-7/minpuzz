import { describe, expect, test } from '@jest/globals';
import { InMemoryGameStore } from '../../repository/gameStore.memory.js';

describe('InMemoryGameStore - connections', () => {
  test('addConnection is idempotent per user and listConnections returns unique users', async () => {
    const store = new InMemoryGameStore();
    const matchId = 'm1';
    const teamId = 't1';

    await store.addConnection(matchId, teamId, 'u1');
    await store.addConnection(matchId, teamId, 'u1');
    await store.addConnection(matchId, teamId, 'u2');

    const list = await store.listConnections(matchId, teamId);
    expect(list.isOk()).toBe(true);
    if (list.isOk()) {
      const users = list.value.sort();
      expect(users).toEqual(['u1', 'u2']);
    }
  });

  test('connections are scoped by match and team', async () => {
    const store = new InMemoryGameStore();
    await store.addConnection('mA', 't1', 'u1');
    await store.addConnection('mA', 't1', 'u2');
    await store.addConnection('mA', 't2', 'u3');
    await store.addConnection('mB', 't1', 'u4');

    const listA_t1 = await store.listConnections('mA', 't1');
    const listA_t2 = await store.listConnections('mA', 't2');
    const listB_t1 = await store.listConnections('mB', 't1');

    expect(listA_t1.isOk() && listA_t2.isOk() && listB_t1.isOk()).toBe(true);
    if (listA_t1.isOk() && listA_t2.isOk() && listB_t1.isOk()) {
      expect(new Set(listA_t1.value)).toEqual(new Set(['u1', 'u2']));
      expect(new Set(listA_t2.value)).toEqual(new Set(['u3']));
      expect(new Set(listB_t1.value)).toEqual(new Set(['u4']));
    }
  });
});

