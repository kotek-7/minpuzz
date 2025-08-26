import { v4 as uuidv4 } from "uuid";
import { err, ok, Result } from "neverthrow";
import type { RedisClient } from "../../repository/redisClient.js";
import { addTeamToMatchingQueue, getMatchingQueueTeams, removeTeamFromMatchingQueue, RedisTTL } from "../team/team.js";
import type { QueueJoinResult, MatchingRules } from "./types.js";
import { planPartner } from "./logic.js";

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

  await removeTeamFromMatchingQueue(redis, self.teamId);
  await removeTeamFromMatchingQueue(redis, partner.teamId);

  const matchId = uuidv4();
  return ok({ type: "found", matchId, self, partner });
}

