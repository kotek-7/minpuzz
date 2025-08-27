import { RedisGameStore } from '../../../repository/gameStore.redis.js';
import { MockRedisClient } from '../../setup/MockRedisClient.js';
import { incrementTeamPlacedAndGetScore } from '../../../model/game/progress.js';

describe('progress.incrementTeamPlacedAndGetScore', () => {
  test('increments placed count and returns score map', async () => {
    const store = new RedisGameStore(new MockRedisClient() as any);
    const matchId = 'm';
    const teamA = 'A';
    const teamB = 'B';

    const s1 = await incrementTeamPlacedAndGetScore(store, { matchId, teamId: teamA });
    expect(s1.isOk()).toBe(true);
    const s2 = await incrementTeamPlacedAndGetScore(store, { matchId, teamId: teamA });
    expect(s2.isOk() && s2.value.placedByTeam[teamA]).toBe(2);
    const s3 = await incrementTeamPlacedAndGetScore(store, { matchId, teamId: teamB });
    expect(s3.isOk() && s3.value.placedByTeam[teamB]).toBe(1);
  });
});

