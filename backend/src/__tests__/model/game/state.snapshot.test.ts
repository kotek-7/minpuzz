import { RedisGameStore } from '../../../repository/gameStore.redis.js';
import { MockRedisClient } from '../../setup/MockRedisClient.js';
import { buildStateSnapshot } from '../../../model/game/state.js';

describe('buildStateSnapshot', () => {
  test('returns composed snapshot with defaults when missing', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-snap-1';
    const res = await buildStateSnapshot(store, matchId);
    expect(res.isOk()).toBe(true);
    if (res.isOk()) {
      expect(res.value.board).toEqual({ rows: 6, cols: 6 });
      expect(Array.isArray(res.value.pieces)).toBe(true);
      expect(res.value.score).toEqual({ placedByTeam: {} });
      expect(res.value.timer).toBeNull();
      expect(res.value.matchStatus).toBe('UNKNOWN');
    }
  });

  test('uses store values when present', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-snap-2';
    // seed match, piece, score, timer
    await store.setMatch(matchId, { id: matchId, teamA: { teamId: 'TA', memberCount: 1 }, teamB: { teamId: 'TB', memberCount: 1 }, status: 'IN_GAME', createdAt: new Date().toISOString() });
    await store.setPiece(matchId, { id: 'p1', x: 1, y: 2, placed: false });
    await store.setTimer(matchId, { startedAt: new Date().toISOString(), durationMs: 60000 });
    await store.incrTeamPlaced(matchId, 'TA');

    const res = await buildStateSnapshot(store, matchId);
    expect(res.isOk()).toBe(true);
    if (res.isOk()) {
      expect(res.value.pieces.length).toBe(1);
      expect(res.value.score.placedByTeam['TA']).toBe(1);
      expect(res.value.timer).not.toBeNull();
      expect(res.value.matchStatus).toBe('IN_GAME');
    }
  });
});

