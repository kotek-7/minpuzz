import { MockRedisClient } from '../../setup/MockRedisClient.js';
import { createTeam, addMember, startMatching } from '../../../model/team/team.js';
import { joinQueue } from '../../../model/matching/matching.js';
import { recordPlayerConnected } from '../../../model/game/session.js';
import { redisKeys } from '../../../repository/redisKeys.js';
import { TeamStatus } from '../../../model/team/types.js';

describe('model/game/session.recordPlayerConnected', () => {
  let redis: MockRedisClient;

  beforeEach(() => {
    redis = new MockRedisClient();
  });

  it('marks READY and updates teams to IN_GAME when all players connected', async () => {
    const tA = await createTeam(redis, 'leader-A');
    const tB = await createTeam(redis, 'leader-B');
    if (!tA.isOk() || !tB.isOk()) throw new Error('team create failed');
    const aId = tA.value.id;
    const bId = tB.value.id;

    // add 2 members each (user ids: a1,a2,b1,b2)
    await addMember(redis, aId, 'a1');
    await addMember(redis, aId, 'a2');
    await addMember(redis, bId, 'b1');
    await addMember(redis, bId, 'b2');

    expect((await startMatching(redis, aId)).isOk()).toBe(true);
    expect((await startMatching(redis, bId)).isOk()).toBe(true);

    // create match (A joins then B matches)
    const r1 = await joinQueue(redis, aId);
    expect(r1.isOk()).toBe(true);
    const r2 = await joinQueue(redis, bId);
    expect(r2.isOk()).toBe(true);
    if (!r2.isOk() || r2.value.type !== 'found') throw new Error('no match');
    const matchId = r2.value.matchId;

    // connect players
    const s1 = await recordPlayerConnected(redis, matchId, aId, 'a1');
    expect(s1.isOk()).toBe(true);
    if (s1.isOk()) expect(s1.value.allConnected).toBe(false);

    const s2 = await recordPlayerConnected(redis, matchId, aId, 'a2');
    expect(s2.isOk()).toBe(true);
    if (s2.isOk()) expect(s2.value.allConnected).toBe(false);

    const s3 = await recordPlayerConnected(redis, matchId, bId, 'b1');
    expect(s3.isOk()).toBe(true);
    if (s3.isOk()) expect(s3.value.allConnected).toBe(false);

    const s4 = await recordPlayerConnected(redis, matchId, bId, 'b2');
    expect(s4.isOk()).toBe(true);
    if (s4.isOk()) expect(s4.value.allConnected).toBe(true);

    // match becomes READY
    const mRaw = await redis.get(redisKeys.match(matchId));
    expect(mRaw.isOk()).toBe(true);
    if (mRaw.isOk()) {
      const m = mRaw.value ? JSON.parse(mRaw.value) : null;
      expect(m.status).toBe('READY');
    }
    // teams become IN_GAME
    const tAraw = await redis.get(redisKeys.team(aId));
    const tBraw = await redis.get(redisKeys.team(bId));
    expect(tAraw.isOk()).toBe(true);
    expect(tBraw.isOk()).toBe(true);
    if (tAraw.isOk() && tBraw.isOk()) {
      const ta = tAraw.value ? JSON.parse(tAraw.value) : null;
      const tb = tBraw.value ? JSON.parse(tBraw.value) : null;
      expect(ta.status).toBe(TeamStatus.IN_GAME);
      expect(tb.status).toBe(TeamStatus.IN_GAME);
    }
  });

  it('rejects when team is not part of match', async () => {
    const tA = await createTeam(redis, 'leader-A');
    const tB = await createTeam(redis, 'leader-B');
    if (!tA.isOk() || !tB.isOk()) throw new Error('team create failed');
    const aId = tA.value.id;
    const bId = tB.value.id;
    await addMember(redis, aId, 'a1');
    await addMember(redis, bId, 'b1');
    expect((await startMatching(redis, aId)).isOk()).toBe(true);
    expect((await startMatching(redis, bId)).isOk()).toBe(true);
    await joinQueue(redis, aId);
    const r2 = await joinQueue(redis, bId);
    if (!r2.isOk() || r2.value.type !== 'found') throw new Error('no match');
    const matchId = r2.value.matchId;

    const tC = await createTeam(redis, 'leader-C');
    if (!tC.isOk()) throw new Error('teamC create failed');
    const cId = tC.value.id;
    const res = await recordPlayerConnected(redis, matchId, cId, 'x');
    expect(res.isErr()).toBe(true);
  });
});

