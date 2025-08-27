import { describe, expect, test } from '@jest/globals';
import { MockRedisClient } from '../setup/MockRedisClient.js';
import { RedisGameStore } from '../../repository/gameStore.redis.js';

describe('RedisGameStore - connections', () => {
  test('add/list connections', async () => {
    const redis = new MockRedisClient();
    const store = new RedisGameStore(redis as any);
    await store.addConnection('m1', 't1', 'u1');
    await store.addConnection('m1', 't1', 'u1');
    await store.addConnection('m1', 't1', 'u2');

    const list = await store.listConnections('m1', 't1');
    expect(list.isOk()).toBe(true);
    if (list.isOk()) expect(new Set(list.value)).toEqual(new Set(['u1', 'u2']));
  });
});

