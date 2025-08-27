import { createTimerScheduler } from '../../../socket/middleware/timerScheduler.js';
import { MockRedisClient } from '../../setup/MockRedisClient.js';
import { RedisGameStore } from '../../../repository/gameStore.redis.js';
import { SOCKET_EVENTS } from '../../../socket/events.js';

describe('timerScheduler', () => {
  test('start schedules periodic TIMER_SYNC and stop halts it', async () => {
    jest.useFakeTimers();
    const calls: any[] = [];
    const ioMock = {
      to: (room: string) => ({ emit: (event: string, payload: unknown) => calls.push({ room, event, payload }) }),
    } as any;
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-sched-1';
    await store.setMatch(matchId, { id: matchId, teamA: { teamId: 'TA', memberCount: 1 }, teamB: { teamId: 'TB', memberCount: 1 }, status: 'IN_GAME', createdAt: new Date().toISOString() });
    const now = Date.now();
    await store.setTimer(matchId, { startedAt: new Date(now - 5_000).toISOString(), durationMs: 60_000 });

    const sched = createTimerScheduler(ioMock, store, 50);
    sched.start(matchId);
    // 1 tick
    await jest.advanceTimersByTimeAsync(60);
    const syncs1 = calls.filter(c => c.event === SOCKET_EVENTS.TIMER_SYNC).length;
    expect(syncs1).toBeGreaterThanOrEqual(1);
    const ends1 = calls.filter(c => c.event === SOCKET_EVENTS.GAME_END).length;
    expect(ends1).toBe(0);

    sched.stop(matchId);
    // advance more - no new emissions should occur
    await jest.advanceTimersByTimeAsync(100);
    const syncs2 = calls.filter(c => c.event === SOCKET_EVENTS.TIMER_SYNC).length;
    expect(syncs2).toBe(syncs1);
  });

  test('when timer already expired, emits one TIMER_SYNC and one timeout GAME_END then stops', async () => {
    jest.useFakeTimers();
    const calls: any[] = [];
    const ioMock = {
      to: (room: string) => ({ emit: (event: string, payload: unknown) => calls.push({ room, event, payload }) }),
    } as any;
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-sched-2';
    await store.setMatch(matchId, { id: matchId, teamA: { teamId: 'TA', memberCount: 1 }, teamB: { teamId: 'TB', memberCount: 1 }, status: 'IN_GAME', createdAt: new Date().toISOString() });
    const now = Date.now();
    await store.setTimer(matchId, { startedAt: new Date(now - 120_000).toISOString(), durationMs: 60_000 });

    const sched = createTimerScheduler(ioMock, store, 50);
    sched.start(matchId);

    await jest.advanceTimersByTimeAsync(60);
    const syncs = calls.filter(c => c.event === SOCKET_EVENTS.TIMER_SYNC).length;
    const ends = calls.filter(c => c.event === SOCKET_EVENTS.GAME_END && c.payload?.reason === 'timeout').length;
    expect(syncs).toBeGreaterThanOrEqual(1);
    expect(ends).toBe(1);

    // after scheduler auto-stop, further time advances should not add events
    await jest.advanceTimersByTimeAsync(200);
    const endsAfter = calls.filter(c => c.event === SOCKET_EVENTS.GAME_END && c.payload?.reason === 'timeout').length;
    expect(endsAfter).toBe(1);
  });
});
