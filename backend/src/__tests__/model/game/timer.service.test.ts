import { tick } from '../../../model/game/timerService.js';
import { MockRedisClient } from '../../setup/MockRedisClient.js';
import { RedisGameStore } from '../../../repository/gameStore.redis.js';
import { SOCKET_EVENTS } from '../../../socket/events.js';

describe('timerService.tick', () => {
  test('emits timer-sync with remaining and returns synced', async () => {
    const calls: any[] = [];
    const ioMock = { to: (room: string) => ({ emit: (event: string, payload: unknown) => calls.push({ room, event, payload }) }) } as any;
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-timer-1';
    await store.setMatch(matchId, { id: matchId, teamA: { teamId: 'TA', memberCount: 1 }, teamB: { teamId: 'TB', memberCount: 1 }, status: 'IN_GAME', createdAt: new Date().toISOString() });
    const now = new Date();
    const startedAt = new Date(now.getTime() - 10_000).toISOString(); // 10s ago
    await store.setTimer(matchId, { startedAt, durationMs: 60_000 });

    const res = await tick(ioMock, store, matchId, now.toISOString());
    expect(res.isOk() && res.value === 'synced').toBe(true);
    const sync = calls.find((c) => c.event === SOCKET_EVENTS.TIMER_SYNC);
    expect(sync).toBeTruthy();
    if (sync) {
      expect(sync.room).toBe(`room:match:${matchId}:public`);
      expect(sync.payload.remainingMs).toBeGreaterThan(45_000);
      expect(sync.payload.remainingMs).toBeLessThan(60_000);
    }
  });

  test('when remaining<=0, emits timeout game-end and returns timeout', async () => {
    const calls: any[] = [];
    const ioMock = { to: (room: string) => ({ emit: (event: string, payload: unknown) => calls.push({ room, event, payload }) }) } as any;
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-timer-2';
    await store.setMatch(matchId, { id: matchId, teamA: { teamId: 'TA', memberCount: 1 }, teamB: { teamId: 'TB', memberCount: 1 }, status: 'IN_GAME', createdAt: new Date().toISOString() });
    const now = new Date();
    const startedAt = new Date(now.getTime() - 120_000).toISOString(); // 120s ago
    await store.setTimer(matchId, { startedAt, durationMs: 60_000 });

    const res = await tick(ioMock, store, matchId, now.toISOString());
    expect(res.isOk() && res.value === 'timeout').toBe(true);
    const end = calls.find((c) => c.event === SOCKET_EVENTS.GAME_END);
    expect(end).toBeTruthy();
    if (end) {
      expect(end.payload.reason).toBe('timeout');
      expect(end.room).toBe(`room:match:${matchId}:public`);
    }
  });

  test('skips when timer is not set (no emission, returns synced)', async () => {
    const calls: any[] = [];
    const ioMock = { to: (room: string) => ({ emit: (event: string, payload: unknown) => calls.push({ room, event, payload }) }) } as any;
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-timer-3';
    await store.setMatch(matchId, { id: matchId, teamA: { teamId: 'TA', memberCount: 1 }, teamB: { teamId: 'TB', memberCount: 1 }, status: 'IN_GAME', createdAt: new Date().toISOString() });
    // タイマー未設定
    const res = await tick(ioMock, store, matchId, new Date().toISOString());
    expect(res.isOk() && res.value === 'synced').toBe(true);
    expect(calls.length).toBe(0);
  });
});
