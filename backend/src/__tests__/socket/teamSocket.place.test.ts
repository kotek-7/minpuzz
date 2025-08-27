import { registerTeamHandler } from '../../socket/teamSocket.js';
import { SOCKET_EVENTS } from '../../socket/events.js';
import { MockRedisClient } from '../setup/MockRedisClient.js';
import { RedisGameStore } from '../../repository/gameStore.redis.js';

describe('teamSocket: piece-place integration (emit to team/public)', () => {
  test('emits piece-placed to team and progress-update to public; game-end on completion', async () => {
    const calls: any[] = [];
    const ioMock = {
      to: (room: string) => ({
        emit: (event: string, payload: unknown) => calls.push({ room, event, payload }),
      }),
      in: (_room: string) => ({ fetchSockets: async () => [] }),
    } as any;

    const handlers: Record<string, Function> = {};
    const socketMock = {
      id: 's1',
      rooms: new Set<string>(),
      on: (event: string, fn: Function) => { handlers[event] = fn; },
      emit: (event: string, payload: unknown) => calls.push({ room: `socket:s1`, event, payload }),
      join: async (room: string) => { (socketMock.rooms as Set<string>).add(room); },
      leave: async (room: string) => { (socketMock.rooms as Set<string>).delete(room); },
      to: (room: string) => ({ emit: (event: string, payload: unknown) => calls.push({ room, event, payload }) }),
    } as any;

    const redis = new MockRedisClient();
    registerTeamHandler(ioMock, socketMock, redis);

    // seed state via the same redis
    const store = new RedisGameStore(redis as any);
    const matchId = 'mSock';
    const teamA = 'TA';
    await store.setMatch(matchId, {
      id: matchId,
      teamA: { teamId: teamA, memberCount: 2 },
      teamB: { teamId: 'TB', memberCount: 2 },
      status: 'IN_GAME',
      createdAt: new Date().toISOString(),
    });
    await store.setPiece(matchId, { id: 'p1', x: 0, y: 0, placed: false });
    await store.setPiece(matchId, { id: 'p2', x: 5, y: 5, placed: false });

    // acquire lock via grab handler for p1
    await handlers[SOCKET_EVENTS.PIECE_GRAB]({ matchId, teamId: teamA, userId: 'u1', pieceId: 'p1' });
    // place p1
    await handlers[SOCKET_EVENTS.PIECE_PLACE]({ matchId, teamId: teamA, userId: 'u1', pieceId: 'p1', row: 0, col: 0, x: 10, y: 11 });

    // verify piece-placed to team room and progress-update to public
    expect(calls.find(c => c.room === `team:${teamA}` && c.event === SOCKET_EVENTS.PIECE_PLACED)).toBeTruthy();
    expect(calls.find(c => c.room === `room:match:${matchId}:public` && c.event === SOCKET_EVENTS.PROGRESS_UPDATE)).toBeTruthy();

    // place p2 to complete and expect game-end once
    await handlers[SOCKET_EVENTS.PIECE_GRAB]({ matchId, teamId: teamA, userId: 'u1', pieceId: 'p2' });
    await handlers[SOCKET_EVENTS.PIECE_PLACE]({ matchId, teamId: teamA, userId: 'u1', pieceId: 'p2', row: 0, col: 1, x: 12, y: 13 });

    const gameEnds = calls.filter(c => c.room === `room:match:${matchId}:public` && c.event === SOCKET_EVENTS.GAME_END);
    expect(gameEnds.length).toBe(1);
  });
});

