import { RedisGameStore } from '../../repository/gameStore.redis.js';
import { MockRedisClient } from '../setup/MockRedisClient.js';

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

describe('RedisGameStore - locks', () => {
  test('acquire denies on conflict and allows after TTL', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm1';
    const pieceId = 'p1';
    const ok1 = await store.acquirePieceLock(matchId, pieceId, 'u1', 0.05);
    expect(ok1.isOk()).toBe(true);
    const conflict = await store.acquirePieceLock(matchId, pieceId, 'u2', 1);
    expect(conflict.isErr()).toBe(true);
    await sleep(70);
    const ok2 = await store.acquirePieceLock(matchId, pieceId, 'u2', 1);
    expect(ok2.isOk()).toBe(true);
  });

  test('release only by holder', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    await store.acquirePieceLock('m1', 'p1', 'u1', 1);
    const notHolder = await store.releasePieceLock('m1', 'p1', 'u2');
    expect(notHolder.isErr()).toBe(true);
    const holder = await store.releasePieceLock('m1', 'p1', 'u1');
    expect(holder.isOk()).toBe(true);
  });
});

