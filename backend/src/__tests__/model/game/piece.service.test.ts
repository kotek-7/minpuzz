import { RedisGameStore } from '../../../repository/gameStore.redis.js';
import { MockRedisClient } from '../../setup/MockRedisClient.js';
import * as PieceService from '../../../model/game/pieceService.js';

describe('pieceService grab/move/release', () => {
  test('grab succeeds and sets holder; parallel grabs conflict', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    await store.setPiece('m', { id: 'p', x: 0, y: 0, placed: false });

    const [r1, r2] = await Promise.all([
      PieceService.grab(store, { matchId: 'm', pieceId: 'p', userId: 'u1', lockTtlSec: 1 }),
      PieceService.grab(store, { matchId: 'm', pieceId: 'p', userId: 'u2', lockTtlSec: 1 }),
    ]);
    const oks = [r1, r2].filter(r => r.isOk()).length;
    const errs = [r1, r2].filter(r => r.isErr()).length;
    expect(oks).toBe(1);
    expect(errs).toBe(1);
  });

  test('move rejects non-holder and updates position for holder', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    await store.setPiece('m', { id: 'p', x: 0, y: 0, placed: false });
    await PieceService.grab(store, { matchId: 'm', pieceId: 'p', userId: 'u1', lockTtlSec: 1 });

    const notHolder = await PieceService.move(store, { matchId: 'm', pieceId: 'p', userId: 'u2', x: 5, y: 6, ts: 1 });
    expect(notHolder.isErr()).toBe(true);

    const ok = await PieceService.move(store, { matchId: 'm', pieceId: 'p', userId: 'u1', x: 10, y: 11, ts: 2 });
    expect(ok.isOk() && ok.value.x === 10 && ok.value.y === 11).toBe(true);
  });

  test('release clears holder and allows new grab', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    await store.setPiece('m', { id: 'p', x: 0, y: 0, placed: false });
    await PieceService.grab(store, { matchId: 'm', pieceId: 'p', userId: 'u1', lockTtlSec: 1 });
    const rel = await PieceService.release(store, { matchId: 'm', pieceId: 'p', userId: 'u1', x: 1, y: 2 });
    expect(rel.isOk()).toBe(true);

    const grab2 = await PieceService.grab(store, { matchId: 'm', pieceId: 'p', userId: 'u2', lockTtlSec: 1 });
    expect(grab2.isOk()).toBe(true);
  });
});
