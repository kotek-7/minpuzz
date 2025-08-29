import type { GameStore } from '../../repository/gameStore.js';

export async function seedPiecesIfEmpty(
  store: GameStore,
  params: { matchId: string; rows: number; cols: number }
): Promise<void> {
  const list = await store.listPieces(params.matchId);
  if (list.isErr()) return;
  if (list.value.length > 0) return;
  // 単純に rows*cols 分のピースを生成（x,yは散布）。solRow/solColを付与。
  const pieces = [] as { id: string; x: number; y: number; placed: boolean; solRow: number; solCol: number }[];
  for (let r = 0; r < params.rows; r++) {
    for (let c = 0; c < params.cols; c++) {
      const id = `p-${r}-${c}`;
      pieces.push({ id, x: Math.random() * 500, y: Math.random() * 500, placed: false, solRow: r, solCol: c });
    }
  }
  for (const p of pieces) {
    await store.setPiece(params.matchId, p as any);
  }
}

