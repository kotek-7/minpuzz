import { registerTeamHandler } from '../../socket/teamSocket.js';
import { SOCKET_EVENTS } from '../../socket/events.js';
import { MockRedisClient } from '../setup/MockRedisClient.js';
import { RedisGameStore } from '../../repository/gameStore.redis.js';

describe('Scenario (click): place -> progress', () => {
  test('team places a piece and progress updates public', async () => {
    const calls: any[] = [];
    const ioMock = {
      to: (room: string) => ({ emit: (event: string, payload: unknown) => calls.push({ room, event, payload }) }),
      in: (_room: string) => ({ fetchSockets: async () => [] }),
    } as any;

    const handlers: Record<string, Function> = {};
    const socketMock = {
      id: 's-scn-1',
      rooms: new Set<string>(),
      on: (event: string, fn: Function) => { handlers[event] = fn; },
      emit: (event: string, payload: any) => calls.push({ room: `socket:s-scn-1`, event, payload }),
      join: async (room: string) => { (socketMock.rooms as Set<string>).add(room); },
      leave: async (room: string) => { (socketMock.rooms as Set<string>).delete(room); },
      to: (room: string) => ({ emit: (event: string, payload: unknown) => calls.push({ room, event, payload }) }),
    } as any;

    const redis = new MockRedisClient();
    registerTeamHandler(ioMock, socketMock, redis as any);

    const store = new RedisGameStore(redis as any);
    const matchId = 'm-scn-1';
    const teamA = 'TA';
    await store.setMatch(matchId, { id: matchId, teamA: { teamId: teamA, memberCount: 1 }, teamB: { teamId: 'TB', memberCount: 1 }, status: 'IN_GAME', createdAt: new Date().toISOString() });
    await store.setPiece(matchId, { id: 'p1', placed: false } as any);

    await handlers[SOCKET_EVENTS.PIECE_PLACE]({ matchId, teamId: teamA, userId: 'u1', pieceId: 'p1', row: 0, col: 0 });

    const placed = calls.find(c => c.event === SOCKET_EVENTS.PIECE_PLACED);
    const progress = calls.find(c => c.event === SOCKET_EVENTS.PROGRESS_UPDATE);
    expect(placed).toBeTruthy();
    expect(progress).toBeTruthy();
  });
});
