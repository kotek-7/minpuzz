
import { MockRedisClient } from '../setup/MockRedisClient.js';
import { RedisGameStore } from '../../repository/gameStore.redis.js';

describe('RedisGameStore - connections (click)', () => {
  test('add/list connections', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-click-4';
    const teamId = 'teamA';
    const u1 = await store.addConnection(matchId, teamId, 'u1');
    const u2 = await store.addConnection(matchId, teamId, 'u2');
    expect(u1.isOk() && u2.isOk()).toBe(true);
    const list = await store.listConnections(matchId, teamId);
    expect(list.isOk() && list.value.sort().join(',')).toBe('u1,u2');
  });
});

