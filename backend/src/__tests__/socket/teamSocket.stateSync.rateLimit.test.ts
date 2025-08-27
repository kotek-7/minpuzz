import { registerTeamHandler } from '../../socket/teamSocket.js';
import { SOCKET_EVENTS } from '../../socket/events.js';
import { MockRedisClient } from '../setup/MockRedisClient.js';

describe('teamSocket: state-sync request is rate-limited', () => {
  test('rapid repeated request-game-init emits only once within window', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date());
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

    const req = () => handlers[SOCKET_EVENTS.REQUEST_GAME_INIT]({ matchId: 'm', teamId: 't', userId: 'u' });
    await req();
    await req();
    await req();

    const syncs0 = calls.filter(c => c.event === SOCKET_EVENTS.STATE_SYNC).length;
    expect(syncs0).toBe(1);

    // move time forward beyond throttling window and request again
    await jest.advanceTimersByTimeAsync(600);
    await req();
    const syncs1 = calls.filter(c => c.event === SOCKET_EVENTS.STATE_SYNC).length;
    expect(syncs1).toBe(2);
  });
});

