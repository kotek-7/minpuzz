import { registerTeamHandler } from '../../socket/teamSocket.js';
import { SOCKET_EVENTS } from '../../socket/events.js';
import { MockRedisClient } from '../setup/MockRedisClient.js';
import { RedisGameStore } from '../../repository/gameStore.redis.js';

describe('teamSocket: game-init includes timer when available', () => {
  test('JOIN_GAME emits GAME_INIT with startedAt/durationMs when timer exists', async () => {
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
    const matchId = 'm-init-timer';
    const startedAt = new Date().toISOString();
    await store.setTimer(matchId, { startedAt, durationMs: 120_000 });

    await handlers[SOCKET_EVENTS.JOIN_GAME]({ matchId, teamId: 'TA', userId: 'u1' });

    const init = calls.find(c => c.event === SOCKET_EVENTS.GAME_INIT);
    expect(init).toBeTruthy();
    if (init) {
      expect(init.payload.startedAt).toBe(startedAt);
      expect(init.payload.durationMs).toBe(120_000);
    }
  });
});

