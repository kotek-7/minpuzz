import { registerTeamHandler } from '../../socket/teamSocket.js';
import { SOCKET_EVENTS } from '../../socket/events.js';
import { MockRedisClient } from '../setup/MockRedisClient.js';
import { RedisGameStore } from '../../repository/gameStore.redis.js';
import { redisKeys } from '../../repository/redisKeys.js';

describe('teamSocket: timer integration', () => {
  test('GAME_START triggers scheduler and emits TIMER_SYNC periodically', async () => {
    jest.useFakeTimers();
    const calls: any[] = [];
    const ioMock = {
      to: (room: string) => ({ emit: (event: string, payload: unknown) => calls.push({ room, event, payload }) }),
      in: (_room: string) => ({ fetchSockets: async () => [] }),
    } as any;

    const makeSocket = (id: string) => {
      const handlers: Record<string, Function> = {};
      const socketMock = {
        id,
        rooms: new Set<string>(),
        on: (event: string, fn: Function) => { handlers[event] = fn; },
        emit: (event: string, payload: unknown) => calls.push({ room: `socket:${id}`, event, payload }),
        join: async (room: string) => { (socketMock.rooms as Set<string>).add(room); },
        leave: async (room: string) => { (socketMock.rooms as Set<string>).delete(room); },
        to: (room: string) => ({ emit: (event: string, payload: unknown) => calls.push({ room, event, payload }) }),
      } as any;
      return { socketMock, handlers };
    };

    const redis = new MockRedisClient();
    const store = new RedisGameStore(redis as any);
    const matchId = 'm-timer-int-1';
    const teamA = 'TA', teamB = 'TB';
    const nowIso = new Date().toISOString();
    await store.setMatch(matchId, { id: matchId, teamA: { teamId: teamA, memberCount: 1 }, teamB: { teamId: teamB, memberCount: 1 }, status: 'PREPARING', createdAt: nowIso });
    // minimal teams and membership
    await redis.set(redisKeys.team(teamA), JSON.stringify({ id: teamA, teamNumber: '000001', currentMembers: 1, maxMembers: 4, status: 'PREPARING', createdBy: 'L', createdAt: nowIso, updatedAt: nowIso }));
    await redis.set(redisKeys.team(teamB), JSON.stringify({ id: teamB, teamNumber: '000002', currentMembers: 1, maxMembers: 4, status: 'PREPARING', createdBy: 'L', createdAt: nowIso, updatedAt: nowIso }));
    await redis.hset(redisKeys.teamMembers(teamA), 'uA', JSON.stringify({ id: 'mA', userId: 'uA' }));
    await redis.hset(redisKeys.teamMembers(teamB), 'uB', JSON.stringify({ id: 'mB', userId: 'uB' }));

    const { socketMock: sA, handlers: hA } = makeSocket('sA');
    const { socketMock: sB, handlers: hB } = makeSocket('sB');
    registerTeamHandler(ioMock, sA, redis as any);
    registerTeamHandler(ioMock, sB, redis as any);

    // both players join game (allConnected)
    await hA[SOCKET_EVENTS.JOIN_GAME]({ matchId, teamId: teamA, userId: 'uA' });
    await hB[SOCKET_EVENTS.JOIN_GAME]({ matchId, teamId: teamB, userId: 'uB' });

    // expect GAME_START and then timer-sync after interval
    const started = calls.filter(c => c.event === SOCKET_EVENTS.GAME_START);
    expect(started.length).toBeGreaterThanOrEqual(1);

    await jest.advanceTimersByTimeAsync(5100);
    const syncs = calls.filter(c => c.event === SOCKET_EVENTS.TIMER_SYNC && c.room === `room:match:${matchId}:public`);
    expect(syncs.length).toBeGreaterThanOrEqual(1);
  });

  test('scheduler emits timeout when timer already expired after GAME_START', async () => {
    jest.useFakeTimers();
    const calls: any[] = [];
    const ioMock = {
      to: (room: string) => ({ emit: (event: string, payload: unknown) => calls.push({ room, event, payload }) }),
      in: (_room: string) => ({ fetchSockets: async () => [] }),
    } as any;

    const makeSocket = (id: string) => {
      const handlers: Record<string, Function> = {};
      const socketMock = {
        id,
        rooms: new Set<string>(),
        on: (event: string, fn: Function) => { handlers[event] = fn; },
        emit: (event: string, payload: unknown) => calls.push({ room: `socket:${id}`, event, payload }),
        join: async (room: string) => { (socketMock.rooms as Set<string>).add(room); },
        leave: async (room: string) => { (socketMock.rooms as Set<string>).delete(room); },
        to: (room: string) => ({ emit: (event: string, payload: unknown) => calls.push({ room, event, payload }) }),
      } as any;
      return { socketMock, handlers };
    };

    const redis = new MockRedisClient();
    const store = new RedisGameStore(redis as any);
    const matchId = 'm-timer-int-2';
    const teamA = 'TA', teamB = 'TB';
    const now = new Date();
    const nowIso = now.toISOString();
    await store.setMatch(matchId, { id: matchId, teamA: { teamId: teamA, memberCount: 1 }, teamB: { teamId: teamB, memberCount: 1 }, status: 'PREPARING', createdAt: nowIso });
    await redis.set(redisKeys.team(teamA), JSON.stringify({ id: teamA, teamNumber: '000001', currentMembers: 1, maxMembers: 4, status: 'PREPARING', createdBy: 'L', createdAt: nowIso, updatedAt: nowIso }));
    await redis.set(redisKeys.team(teamB), JSON.stringify({ id: teamB, teamNumber: '000002', currentMembers: 1, maxMembers: 4, status: 'PREPARING', createdBy: 'L', createdAt: nowIso, updatedAt: nowIso }));
    await redis.hset(redisKeys.teamMembers(teamA), 'uA', JSON.stringify({ id: 'mA', userId: 'uA' }));
    await redis.hset(redisKeys.teamMembers(teamB), 'uB', JSON.stringify({ id: 'mB', userId: 'uB' }));

    const { socketMock: sA, handlers: hA } = makeSocket('sA');
    const { socketMock: sB, handlers: hB } = makeSocket('sB');
    registerTeamHandler(ioMock, sA, redis as any);
    registerTeamHandler(ioMock, sB, redis as any);

    await hA[SOCKET_EVENTS.JOIN_GAME]({ matchId, teamId: teamA, userId: 'uA' });
    await hB[SOCKET_EVENTS.JOIN_GAME]({ matchId, teamId: teamB, userId: 'uB' });

    // Overwrite timer to already past to trigger immediate timeout on next tick
    const startedAtPast = new Date(now.getTime() - 120_000).toISOString();
    await store.setTimer(matchId, { startedAt: startedAtPast, durationMs: 60_000 });

    await jest.advanceTimersByTimeAsync(5100);
    const ends = calls.filter(c => c.event === SOCKET_EVENTS.GAME_END && c.payload?.reason === 'timeout');
    expect(ends.length).toBe(1);
  });
});
