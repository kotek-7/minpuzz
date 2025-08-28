import { registerTeamHandler } from '../../socket/teamSocket.js';
import { SOCKET_EVENTS } from '../../socket/events.js';
import { MockRedisClient } from '../setup/MockRedisClient.js';
import { RedisGameStore } from '../../repository/gameStore.redis.js';

describe('teamSocket: request-game-init -> state-sync', () => {
  test('returns latest snapshot to requester only', async () => {
    const calls: any[] = [];
    const ioMock = {
      to: (_room: string) => ({ emit: (_event: string, _payload: unknown) => {} }),
      in: (_room: string) => ({ fetchSockets: async () => [] }),
    } as any;

    const handlers: Record<string, Function> = {};
    const socketMock = {
      id: 's1',
      rooms: new Set<string>(),
      on: (event: string, fn: Function) => { handlers[event] = fn; },
      emit: (event: string, payload: any) => calls.push({ room: `socket:s1`, event, payload }),
      join: async (room: string) => { (socketMock.rooms as Set<string>).add(room); },
      leave: async (room: string) => { (socketMock.rooms as Set<string>).delete(room); },
      to: (room: string) => ({ emit: (event: string, payload: unknown) => calls.push({ room, event, payload }) }),
    } as any;

    const redis = new MockRedisClient();
    registerTeamHandler(ioMock, socketMock, redis as any);

    const store = new RedisGameStore(redis as any);
    const matchId = 'm-state-1';
    await store.setMatch(matchId, { id: matchId, teamA: { teamId: 'TA', memberCount: 1 }, teamB: { teamId: 'TB', memberCount: 1 }, status: 'IN_GAME', createdAt: new Date().toISOString() });
    await store.setPiece(matchId, { id: 'p1', x: 1, y: 2, placed: false });
    await store.incrTeamPlaced(matchId, 'TA');

    await handlers[SOCKET_EVENTS.REQUEST_GAME_INIT]({ matchId, teamId: 'TA', userId: 'u1' });

    const sync = calls.find(c => c.event === SOCKET_EVENTS.STATE_SYNC && c.room === 'socket:s1');
    expect(sync).toBeTruthy();
    if (sync) {
      expect(sync.payload.pieces.length).toBe(1);
      expect(sync.payload.score.placedByTeam['TA']).toBe(1);
      expect(sync.payload.board).toEqual({ rows: 5, cols: 5 });
    }
  });

  test('JOIN_GAME emits GAME_INIT then immediate STATE_SYNC to self', async () => {
    const calls: any[] = [];
    const ioMock = {
      to: (_room: string) => ({ emit: (_event: string, _payload: unknown) => {} }),
      in: (_room: string) => ({ fetchSockets: async () => [] }),
    } as any;

    const handlers: Record<string, Function> = {};
    const socketMock = {
      id: 's1',
      rooms: new Set<string>(),
      on: (event: string, fn: Function) => { handlers[event] = fn; },
      emit: (event: string, payload: any) => calls.push({ room: `socket:s1`, event, payload }),
      join: async (room: string) => { (socketMock.rooms as Set<string>).add(room); },
      leave: async (room: string) => { (socketMock.rooms as Set<string>).delete(room); },
      to: (room: string) => ({ emit: (event: string, payload: unknown) => calls.push({ room, event, payload }) }),
    } as any;

    const redis = new MockRedisClient();
    registerTeamHandler(ioMock, socketMock, redis as any);

    const store = new RedisGameStore(redis as any);
    const matchId = 'm-state-join';
    await store.setMatch(matchId, { id: matchId, teamA: { teamId: 'TA', memberCount: 1 }, teamB: { teamId: 'TB', memberCount: 1 }, status: 'PREPARING', createdAt: new Date().toISOString() });
    await store.setPiece(matchId, { id: 'p1', x: 1, y: 2, placed: false });

    await handlers[SOCKET_EVENTS.JOIN_GAME]({ matchId, teamId: 'TA', userId: 'u1' });

    const init = calls.find(c => c.event === SOCKET_EVENTS.GAME_INIT);
    const sync = calls.find(c => c.event === SOCKET_EVENTS.STATE_SYNC && c.room === 'socket:s1');
    expect(init).toBeTruthy();
    expect(sync).toBeTruthy();
    if (sync) {
      expect(Array.isArray(sync.payload.pieces)).toBe(true);
    }
  });
});
