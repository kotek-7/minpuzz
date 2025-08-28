
import { MockRedisClient } from '../setup/MockRedisClient.js';
import { RedisGameStore } from '../../repository/gameStore.redis.js';

describe('RedisGameStore - score & timer (click)', () => {
  test('score incr/set/get', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-click-2';
    const tA = 'teamA';
    const tB = 'teamB';
    const s0 = await store.getScore(matchId);
    expect(s0.isOk() && Object.keys(s0.value.placedByTeam).length === 0).toBe(true);
    const a1 = await store.incrTeamPlaced(matchId, tA);
    const a2 = await store.incrTeamPlaced(matchId, tA);
    const b1 = await store.incrTeamPlaced(matchId, tB);
    expect(a1.isOk() && a1.value === 1 && a2.isOk() && a2.value === 2 && b1.isOk() && b1.value === 1).toBe(true);
    const cur = await store.getScore(matchId);
    expect(cur.isOk() && cur.value.placedByTeam[tA] === 2 && cur.value.placedByTeam[tB] === 1).toBe(true);
    const set = await store.setPlaced(matchId, tB, 5);
    expect(set.isOk() && set.value === 5).toBe(true);
  });

  test('timer set/get', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-click-3';
    const timer = { startedAt: new Date().toISOString(), durationMs: 120000 };
    const set = await store.setTimer(matchId, timer);
    expect(set.isOk()).toBe(true);
    const got = await store.getTimer(matchId);
    expect(got.isOk() && got.value && got.value.durationMs === timer.durationMs).toBe(true);
  });
});

