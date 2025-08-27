import { registerTeamHandler } from '../../socket/teamSocket.js';
import { SOCKET_EVENTS } from '../../socket/events.js';
import { MockRedisClient } from '../setup/MockRedisClient.js';
import { RedisGameStore } from '../../repository/gameStore.redis.js';
import { defaultGeometry, cellCenter } from '../../model/game/geometry.js';

describe('teamSocket: piece-place denied cases', () => {
  test('emits piece-place-denied with reason=invalidCell when outside snap or wrong cell', async () => {
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

    const store = new RedisGameStore(redis as any);
    const matchId = 'mDenied';
    const teamA = 'TA';
    await store.setMatch(matchId, {
      id: matchId,
      teamA: { teamId: teamA, memberCount: 2 },
      teamB: { teamId: 'TB', memberCount: 2 },
      status: 'IN_GAME',
      createdAt: new Date().toISOString(),
    });
    await store.setPiece(matchId, { id: 'p1', x: 0, y: 0, placed: false, solRow: 0, solCol: 0 });

    // grab by u1
    await handlers[SOCKET_EVENTS.PIECE_GRAB]({ matchId, teamId: teamA, userId: 'u1', pieceId: 'p1' });

    // attempt with wrong cell (solRow/solCol=0,0 but request row=1)
    const c = cellCenter(defaultGeometry, 0, 0);
    const x = c.x; const y = c.y;
    await handlers[SOCKET_EVENTS.PIECE_PLACE]({ matchId, teamId: teamA, userId: 'u1', pieceId: 'p1', row: 1, col: 0, x, y });

    const denied = calls.find(ca => ca.room === 'socket:s1' && ca.event === SOCKET_EVENTS.PIECE_PLACE_DENIED);
    expect(denied).toBeTruthy();
    if (denied) {
      expect(denied.payload).toMatchObject({ reason: 'invalidCell' });
    }

    // ensure no piece-placed emitted for team on denial
    expect(calls.find(ca => ca.room === `team:${teamA}` && ca.event === SOCKET_EVENTS.PIECE_PLACED)).toBeFalsy();
  });
});
