import { NoopPublisher, SpyPublisher, SocketPublisher } from '../../socket/publisher.js';

describe('Publisher - Spy/Noop', () => {
  test('SpyPublisher records calls for team/public/user', () => {
    const spy = new SpyPublisher();
    spy.toTeam('t1').emit('eventA', { a: 1 });
    spy.toPublic('m1').emit('eventB', { b: 2 });
    spy.toUser('s1').emit('eventC', { c: 3 });

    expect(spy.calls).toHaveLength(3);
    expect(spy.calls[0]).toMatchObject({ scope: 'team', key: 't1', event: 'eventA' });
    expect(spy.calls[1]).toMatchObject({ scope: 'public', key: 'm1', event: 'eventB' });
    expect(spy.calls[2]).toMatchObject({ scope: 'user', key: 's1', event: 'eventC' });
  });

  test('NoopPublisher does nothing', () => {
    const noop = new NoopPublisher();
    // Should not throw
    noop.toTeam('t1').emit('e', {});
    noop.toPublic('m1').emit('e', {});
    noop.toUser('s1').emit('e', {});
    expect(true).toBe(true);
  });
});

describe('Publisher - SocketPublisher minimal wiring', () => {
  test('uses io.to(room).emit(event,payload)', () => {
    const calls: any[] = [];
    const ioMock = {
      to: (room: string) => ({
        emit: (event: string, payload: unknown) => calls.push({ room, event, payload }),
      }),
    } as any;
    const pub = new SocketPublisher(ioMock);
    pub.toTeam('T').emit('X', 1);
    pub.toPublic('M').emit('Y', 2);
    pub.toUser('S').emit('Z', 3);
    expect(calls).toEqual([
      { room: 'team:T', event: 'X', payload: 1 },
      { room: 'room:match:M:public', event: 'Y', payload: 2 },
      { room: 'S', event: 'Z', payload: 3 },
    ]);
  });
});

