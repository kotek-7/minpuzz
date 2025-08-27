import type { GameStore } from '../../repository/gameStore.js';
import type { RedisClient } from '../../repository/redisClient.js';

// 全マッチを横断して、指定ユーザーが保持しているピースのロック/holderを回収
export async function reclaimLocksForUserAcrossMatches(
  redis: RedisClient,
  store: GameStore,
  userId: string
): Promise<void> {
  // キーパターンから matchId を抽出（実運用ではサーバ台数/キー数に応じて最適化が必要）
  const keys = await redis.keys('match:*:pieces');
  if (keys.isErr()) return;
  const matchIds = keys.value
    .map((k) => {
      const m = k.match(/^match:(.+):pieces$/);
      return m ? m[1] : null;
    })
    .filter((v): v is string => !!v);

  for (const matchId of matchIds) {
    const piecesR = await store.listPieces(matchId);
    if (piecesR.isErr()) continue;
    for (const p of piecesR.value) {
      if (p.placed) continue;
      if (p.holder === userId) {
        const cleared = { ...p } as any;
        delete cleared.holder;
        const set = await store.setPiece(matchId, cleared);
        if (set.isErr()) continue;
        await store.releasePieceLock(matchId, p.id, userId);
      }
    }
  }
}

