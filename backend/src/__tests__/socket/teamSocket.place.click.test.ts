import { registerTeamHandler } from '../../socket/teamSocket.js';
import { SOCKET_EVENTS } from '../../socket/events.js';
import { MockRedisClient } from '../setup/MockRedisClient.js';
import { RedisGameStore } from '../../repository/gameStore.redis.js';

describe('teamSocket (click): PIECE_PLACE → placed/progress/end', () => {
  test('emits placed to team and progress to public', async () => {
    const calls: any[] = [];
    const ioMock = {
      to: (room: string) => ({ emit: (event: string, payload: unknown) => calls.push({ room, event, payload }) }),
      in: (_room: string) => ({ fetchSockets: async () => [] }),
    } as any;

    const handlers: Record<string, Function> = {};
    const socketMock = {
      id: 's-place-1',
      rooms: new Set<string>(),
      on: (event: string, fn: Function) => { handlers[event] = fn; },
      emit: (event: string, payload: any) => calls.push({ room: `socket:s-place-1`, event, payload }),
      join: async (room: string) => { (socketMock.rooms as Set<string>).add(room); },
      leave: async (room: string) => { (socketMock.rooms as Set<string>).delete(room); },
      to: (room: string) => ({ emit: (event: string, payload: unknown) => calls.push({ room, event, payload }) }),
    } as any;

    const redis = new MockRedisClient();
    registerTeamHandler(ioMock, socketMock, redis as any);

    const store = new RedisGameStore(redis as any);
    const matchId = 'm-place-1';
    const teamId = 'TA';
    await store.setMatch(matchId, { id: matchId, teamA: { teamId, memberCount: 1 }, teamB: { teamId: 'TB', memberCount: 1 }, status: 'IN_GAME', createdAt: new Date().toISOString() });
    await store.setPiece(matchId, { id: 'p1', x: 0, y: 0, placed: false } as any);

    await handlers[SOCKET_EVENTS.PIECE_PLACE]({ matchId, teamId, userId: 'u1', pieceId: 'p1', row: 0, col: 0, x: 0, y: 0 });

    const placed = calls.find(c => c.event === SOCKET_EVENTS.PIECE_PLACED);
    const progress = calls.find(c => c.event === SOCKET_EVENTS.PROGRESS_UPDATE);
    expect(placed).toBeTruthy();
    expect(progress).toBeTruthy();
    if (placed) {
      expect(placed.room).toBe(`team:${teamId}`);
      expect(placed.payload.row).toBe(0);
      expect(placed.payload.col).toBe(0);
    }
    if (progress) {
      expect(progress.room).toBe(`room:match:${matchId}:public`);
      expect(progress.payload.placedByTeam[teamId]).toBe(1);
    }
  });

  test('emits place-denied to requester when occupied', async () => {
    const calls: any[] = [];
    const ioMock = {
      to: (room: string) => ({ emit: (event: string, payload: unknown) => calls.push({ room, event, payload }) }),
      in: (_room: string) => ({ fetchSockets: async () => [] }),
    } as any;
    const handlers: Record<string, Function> = {};
    const socketMock = {
      id: 's-place-2',
      rooms: new Set<string>(),
      on: (event: string, fn: Function) => { handlers[event] = fn; },
      emit: (event: string, payload: any) => calls.push({ room: `socket:s-place-2`, event, payload }),
      join: async (room: string) => { (socketMock.rooms as Set<string>).add(room); },
      leave: async (room: string) => { (socketMock.rooms as Set<string>).delete(room); },
      to: (room: string) => ({ emit: (event: string, payload: unknown) => calls.push({ room, event, payload }) }),
    } as any;

    const redis = new MockRedisClient();
    registerTeamHandler(ioMock, socketMock, redis as any);

    const store = new RedisGameStore(redis as any);
    const matchId = 'm-place-2';
    await store.setMatch(matchId, { id: matchId, teamA: { teamId: 'TA', memberCount: 1 }, teamB: { teamId: 'TB', memberCount: 1 }, status: 'IN_GAME', createdAt: new Date().toISOString() });
    await store.setPiece(matchId, { id: 'p2', x: 0, y: 0, placed: false } as any);
    await store.setPiece(matchId, { id: 'pX', x: 0, y: 0, placed: true, row: 0, col: 0 } as any);

    await handlers[SOCKET_EVENTS.PIECE_PLACE]({ matchId, teamId: 'TA', userId: 'u1', pieceId: 'p2', row: 0, col: 0, x: 0, y: 0 });

    const denied = calls.find(c => c.event === SOCKET_EVENTS.PIECE_PLACE_DENIED && c.room === 'socket:s-place-2');
    expect(denied).toBeTruthy();
    if (denied) {
      expect(denied.payload.pieceId).toBe('p2');
      expect(denied.payload.reason).toBe('invalidCell');
    }
  });
});

