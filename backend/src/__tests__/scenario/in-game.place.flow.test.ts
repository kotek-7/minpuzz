import { RedisGameStore } from '../../repository/gameStore.redis.js';
import { MockRedisClient } from '../setup/MockRedisClient.js';
import * as PieceService from '../../model/game/pieceService.js';
import { incrementTeamPlacedAndGetScore } from '../../model/game/progress.js';
import { completeMatchIfNeeded } from '../../model/game/endService.js';

describe('Scenario: grab -> move -> place -> progress -> complete', () => {
  test('happy path for a small board (2 pieces)', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-flow';
    const teamA = 'TA';
    // seed minimal match and two pieces
    await store.setMatch(matchId, {
      id: matchId,
      teamA: { teamId: teamA, memberCount: 2 },
      teamB: { teamId: 'TB', memberCount: 2 },
      status: 'IN_GAME',
      createdAt: new Date().toISOString(),
    });
    await store.setPiece(matchId, { id: 'p1', x: 0, y: 0, placed: false });
    await store.setPiece(matchId, { id: 'p2', x: 5, y: 5, placed: false });

    // user grabs p1 and moves it
    const g1 = await PieceService.grab(store, { matchId, pieceId: 'p1', userId: 'u1', lockTtlSec: 2 });
    expect(g1.isOk()).toBe(true);
    const m1 = await PieceService.move(store, { matchId, pieceId: 'p1', userId: 'u1', x: 10, y: 11, ts: 1 });
    expect(m1.isOk() && m1.value.x === 10 && m1.value.y === 11).toBe(true);

    // then place p1
    const plc1 = await PieceService.place(store, { matchId, pieceId: 'p1', userId: 'u1', row: 0, col: 0, x: 10, y: 11 });
    expect(plc1.isOk()).toBe(true);
    // progress update (score++)
    const score1 = await incrementTeamPlacedAndGetScore(store, { matchId, teamId: teamA });
    expect(score1.isOk()).toBe(true);
    if (score1.isOk()) {
      expect(score1.value.placedByTeam[teamA]).toBe(1);
    }

    // place the remaining piece p2 and complete
    await PieceService.grab(store, { matchId, pieceId: 'p2', userId: 'u1', lockTtlSec: 2 });
    const plc2 = await PieceService.place(store, { matchId, pieceId: 'p2', userId: 'u1', row: 0, col: 1, x: 12, y: 13 });
    expect(plc2.isOk()).toBe(true);

    const end = await completeMatchIfNeeded(store, matchId);
    expect(end.isOk()).toBe(true);
    if (end.isOk()) {
      // 一度だけcompleted=true、その後はfalseのはず
      expect(end.value.completed).toBe(true);
      const end2 = await completeMatchIfNeeded(store, matchId);
      expect(end2.isOk() && end2.value.completed === false).toBe(true);
    }
  });
});

