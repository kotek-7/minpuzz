import { describe, test, expect } from '@jest/globals';
import { RedisGameStore } from '../../../repository/gameStore.redis.js';
import { MockRedisClient } from '../../setup/MockRedisClient.js';
import { incrementTeamPlacedAndGetScore } from '../../../model/game/progress.js';

describe('progress (click)', () => {
  test('incrementTeamPlacedAndGetScore aggregates by team', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm-progress-1';
    const a1 = await incrementTeamPlacedAndGetScore(store as any, { matchId, teamId: 'TA' });
    const a2 = await incrementTeamPlacedAndGetScore(store as any, { matchId, teamId: 'TA' });
    const b1 = await incrementTeamPlacedAndGetScore(store as any, { matchId, teamId: 'TB' });
    expect(a1.isOk() && a2.isOk() && b1.isOk()).toBe(true);
    if (b1.isOk()) {
      expect(b1.value.placedByTeam['TA']).toBe(2);
      expect(b1.value.placedByTeam['TB']).toBe(1);
    }
  });
});

