import { v4 as uuidv4 } from "uuid";
import { err, ok, Result } from "neverthrow";
import type { RedisClient } from "../../repository/redisClient.js";
import { addTeamToMatchingQueue, getMatchingQueueTeams, removeTeamFromMatchingQueue, RedisTTL } from "../team/team.js";
import type { QueueJoinResult, MatchingRules } from "./types.js";
import { planPartner } from "./logic.js";
import { redisKeys } from "../../repository/redisKeys.js";

const orderPair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

export async function acquireTeamLocks(
  redis: RedisClient,
  a: string,
  b: string,
  ttlSec: number,
): Promise<Result<boolean, string>> {
  const [t1, t2] = orderPair(a, b);
  // helper to attempt single lock with one stale-healing retry
  const tryLock = async (teamId: string): Promise<Result<boolean, string>> => {
    const add = await redis.sadd(redisKeys.matchTeamLocks(), teamId);
    if (add.isErr()) return err(add.error);
    if (add.value === 1) {
      const setRes = await redis.set(redisKeys.matchTeamLock(teamId), "1", ttlSec);
      if (setRes.isErr()) return err(setRes.error);
      if (!setRes.value) return err("failed to set team lock ttl");
      return ok(true);
    }
    // already present; heal if string missing then retry once
    const exists = await redis.get(redisKeys.matchTeamLock(teamId));
    if (exists.isErr()) return err(exists.error);
    if (!exists.value) {
      const cleanup = await redis.srem(redisKeys.matchTeamLocks(), teamId);
      if (cleanup.isErr()) return err(cleanup.error);
      const retry = await redis.sadd(redisKeys.matchTeamLocks(), teamId);
      if (retry.isErr()) return err(retry.error);
      if (retry.value === 1) {
        const setRes2 = await redis.set(redisKeys.matchTeamLock(teamId), "1", ttlSec);
        if (setRes2.isErr()) return err(setRes2.error);
        if (!setRes2.value) return err("failed to set team lock ttl on retry");
        return ok(true);
      }
    }
    return ok(false);
  };

  const l1 = await tryLock(t1);
  if (l1.isErr()) return err(l1.error);
  if (!l1.value) return ok(false);

  const l2 = await tryLock(t2);
  if (l2.isErr()) return err(l2.error);
  if (!l2.value) {
    // release first lock
    await redis.srem(redisKeys.matchTeamLocks(), t1);
    return ok(false);
  }

  return ok(true);
}

export async function releaseTeamLocks(
  redis: RedisClient,
  a: string,
  b: string,
): Promise<Result<void, string>> {
  const [t1, t2] = orderPair(a, b);
  const r1 = await redis.srem(redisKeys.matchTeamLocks(), t1);
  if (r1.isErr()) return err(r1.error);
  const r2 = await redis.srem(redisKeys.matchTeamLocks(), t2);
  if (r2.isErr()) return err(r2.error);
  return ok(void 0);
}

export async function claimPair(
  redis: RedisClient,
  a: string,
  b: string,
  ttlSec: number,
): Promise<Result<{ claimed: boolean; key: string }, string>> {
  const [t1, t2] = orderPair(a, b);
  const key = `${t1}|${t2}`;
  const add = await redis.sadd(redisKeys.matchPairClaims(), key);
  if (add.isErr()) return err(add.error);
  if (add.value === 1) {
    const setRes = await redis.set(redisKeys.matchPairClaim(key), "1", ttlSec);
    if (setRes.isErr()) return err(setRes.error);
    if (!setRes.value) return err("failed to set pair claim ttl");
    return ok({ claimed: true, key });
  }
  return ok({ claimed: false, key });
}

export async function releasePairClaim(
  redis: RedisClient,
  key: string,
): Promise<Result<void, string>> {
  const rem = await redis.srem(redisKeys.matchPairClaims(), key);
  if (rem.isErr()) return err(rem.error);
  return ok(void 0);
}

// マッチング待機から成否の判定までを調停する（ドメイン配下のアプリケーションロジック）
// 目的: I/O境界（Redis操作）と純関数の責務分離を保ちつつ、最小の副作用で結果ADTを返す
export async function joinQueue(
  redis: RedisClient,
  teamId: string,
  now: Date = new Date(),
  rules?: Partial<MatchingRules>
): Promise<Result<QueueJoinResult, string>> {
  const appliedRules: MatchingRules = {
    ttlMs: (rules?.ttlMs ?? (RedisTTL.MATCHING_QUEUE * 1000)),
    requireEqualSize: rules?.requireEqualSize,
    maxSizeDelta: rules?.maxSizeDelta,
  };

  const selfResult = await addTeamToMatchingQueue(redis, teamId);
  if (selfResult.isErr()) return err(selfResult.error);
  const self = selfResult.value;

  const queueResult = await getMatchingQueueTeams(redis);
  if (queueResult.isErr()) return err(queueResult.error);
  const queue = queueResult.value;

  const { partner, expiredIds } = planPartner(self, queue, now, appliedRules);

  for (const expiredId of expiredIds) {
    const cleanup = await removeTeamFromMatchingQueue(redis, expiredId);
    void cleanup; // ベストエフォート清掃
  }

  if (!partner) {
    return ok({ type: "waiting", self });
  }

  // 軽量ロック + ペアクレームで二重成立を防止
  const LOCK_TTL_SEC = 10;
  const lockRes = await acquireTeamLocks(redis, self.teamId, partner.teamId, LOCK_TTL_SEC);
  if (lockRes.isErr()) return err(lockRes.error);
  if (!lockRes.value) {
    return ok({ type: "waiting", self });
  }

  let claimKey: string | null = null;
  try {
    const claimRes = await claimPair(redis, self.teamId, partner.teamId, LOCK_TTL_SEC);
    if (claimRes.isErr()) return err(claimRes.error);
    if (!claimRes.value.claimed) {
      return ok({ type: "waiting", self });
    }
    claimKey = claimRes.value.key;

    await removeTeamFromMatchingQueue(redis, self.teamId);
    await removeTeamFromMatchingQueue(redis, partner.teamId);

    const matchId = uuidv4();
    return ok({ type: "found", matchId, self, partner });
  } finally {
    if (claimKey) {
      await releasePairClaim(redis, claimKey);
    }
    await releaseTeamLocks(redis, self.teamId, partner.teamId);
  }
}
