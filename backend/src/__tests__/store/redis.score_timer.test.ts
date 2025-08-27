import { MockRedisClient } from '../setup/MockRedisClient.js';
import { RedisGameStore } from '../../repository/gameStore.redis.js';

describe('RedisGameStore - score & timer', () => {
  test('score incr and set', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const n1 = await store.incrTeamPlaced('m1', 't1');
    const n2 = await store.incrTeamPlaced('m1', 't1');
    expect(n1.isOk() && n1.value === 1).toBe(true);
    expect(n2.isOk() && n2.value === 2).toBe(true);
    const set = await store.setPlaced('m1', 't2', 5);
    expect(set.isOk() && set.value === 5).toBe(true);
    const s = await store.getScore('m1');
    expect(s.isOk()).toBe(true);
    if (s.isOk()) {
      expect(s.value.placedByTeam['t1']).toBe(2);
      expect(s.value.placedByTeam['t2']).toBe(5);
    }
  });

  test('timer set/get', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const timer = { startedAt: new Date().toISOString(), durationMs: 120000 };
    const set = await store.setTimer('m1', timer);
    expect(set.isOk()).toBe(true);
    const got = await store.getTimer('m1');
    expect(got.isOk() && JSON.stringify(got.value) === JSON.stringify(timer)).toBe(true);
  });
});

