import { RedisGameStore } from '../../repository/gameStore.redis.js';
import { MockRedisClient } from '../setup/MockRedisClient.js';
import * as PieceService from '../../model/game/pieceService.js';

describe('Scenario: grab -> move -> release -> re-grab', () => {
  test('happy path with conflicts and holder checks', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm1';
    const pieceId = 'p1';
    await store.setPiece(matchId, { id: pieceId, x: 0, y: 0, placed: false });

    // concurrent grab contenders
    const [g1, g2] = await Promise.all([
      PieceService.grab(store, { matchId, pieceId, userId: 'u1', lockTtlSec: 1 }),
      PieceService.grab(store, { matchId, pieceId, userId: 'u2', lockTtlSec: 1 }),
    ]);

    // exactly one succeeds
    const okCount = [g1, g2].filter(r => r.isOk()).length;
    expect(okCount).toBe(1);

    // determine holder from store
    const cur = await store.getPiece(matchId, pieceId);
    expect(cur.isOk() && cur.value).toBeTruthy();
    const holder = cur.isOk() && cur.value ? cur.value.holder : undefined;
    expect(holder === 'u1' || holder === 'u2').toBe(true);

    const winner = holder!;
    const loser = winner === 'u1' ? 'u2' : 'u1';

    // non-holder move must fail
    const mvLoser = await PieceService.move(store, { matchId, pieceId, userId: loser, x: 3, y: 4, ts: 1 });
    expect(mvLoser.isErr()).toBe(true);

    // holder move updates position
    const mvWinner = await PieceService.move(store, { matchId, pieceId, userId: winner, x: 10, y: 12, ts: 2 });
    expect(mvWinner.isOk() && mvWinner.value.x === 10 && mvWinner.value.y === 12).toBe(true);

    // release by holder
    const rel = await PieceService.release(store, { matchId, pieceId, userId: winner, x: 11, y: 13 });
    expect(rel.isOk()).toBe(true);

    // immediate re-grab by the other user should succeed
    const g3 = await PieceService.grab(store, { matchId, pieceId, userId: loser, lockTtlSec: 1 });
    expect(g3.isOk()).toBe(true);
  });
});
