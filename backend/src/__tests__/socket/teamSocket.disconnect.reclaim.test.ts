import { registerTeamHandler } from '../../socket/teamSocket.js';
import { SOCKET_EVENTS } from '../../socket/events.js';
import { MockRedisClient } from '../setup/MockRedisClient.js';
import { RedisGameStore } from '../../repository/gameStore.redis.js';
import { redisKeys } from '../../repository/redisKeys.js';

describe('teamSocket: disconnect triggers lock reclaim', () => {
  test('after disconnect, held locks by user are reclaimed', async () => {
    const calls: any[] = [];
    const ioMock = {
      to: (_room: string) => ({ emit: (_event: string, _payload: unknown) => calls.push({ _room, _event, _payload }) }),
      in: (_room: string) => ({ fetchSockets: async () => [] }),
    } as any;

    const handlers: Record<string, Function> = {};
    const socketMock = {
      id: 's-disc-1',
      rooms: new Set<string>(),
      on: (event: string, fn: Function) => { handlers[event] = fn; },
      emit: (event: string, payload: any) => calls.push({ room: `socket:s-disc-1`, event, payload }),
      join: async (room: string) => { (socketMock.rooms as Set<string>).add(room); },
      leave: async (room: string) => { (socketMock.rooms as Set<string>).delete(room); },
      to: (room: string) => ({ emit: (event: string, payload: unknown) => calls.push({ room, event, payload }) }),
    } as any;

    const redis = new MockRedisClient();
    registerTeamHandler(ioMock, socketMock, redis as any);

    const store = new RedisGameStore(redis as any);
    const matchId = 'm-disc-1';
    await store.setMatch(matchId, { id: matchId, teamA: { teamId: 'TA', memberCount: 1 }, teamB: { teamId: 'TB', memberCount: 1 }, status: 'IN_GAME', createdAt: new Date().toISOString() });
    await store.setPiece(matchId, { id: 'p1', x: 0, y: 0, placed: false, holder: 'u1' } as any);
    await store.acquirePieceLock(matchId, 'p1', 'u1', 5);

    // set socket->user mapping so disconnect resolves userId
    await redis.set(redisKeys.socketToUser(socketMock.id), 'u1');

    // trigger disconnect
    await handlers[SOCKET_EVENTS.DISCONNECT]();

    // other user should now be able to acquire lock
    const g = await store.acquirePieceLock(matchId, 'p1', 'u2', 5);
    expect(g.isOk() && g.value === true).toBe(true);
  });
});

