import type { GameStore } from '../../repository/gameStore.js';

// 季節選択のロジック
function selectSeasonForMatch(matchId: string): string {
  const seasons = ["spring", "summer", "autumn", "winter"];
  // マッチIDに基づいてランダムに季節を選択（同じマッチは同じ季節）
  const randomIndex = Math.floor(Math.random() * seasons.length);
  const selectedSeason = seasons[randomIndex];
  
  console.log(`[Backend] Selected season for match ${matchId}: ${selectedSeason} (index: ${randomIndex})`);
  return selectedSeason;
}

export async function seedPiecesIfEmpty(
  store: GameStore,
  params: { matchId: string; rows: number; cols: number }
): Promise<void> {
  const list = await store.listPieces(params.matchId);
  if (list.isErr()) return;
  if (list.value.length > 0) return;
  
  // マッチIDに基づいて季節を選択
  const selectedSeason = selectSeasonForMatch(params.matchId);
  
  // 画像番号順に正解位置を設定（1から25まで）
  const pieces = [] as { id: string; x: number; y: number; placed: boolean; solRow: number; solCol: number; season: string }[];
  let pieceNumber = 1;
  
  for (let r = 0; r < params.rows; r++) {
    for (let c = 0; c < params.cols; c++) {
      const id = `p-${pieceNumber}`; // 画像番号をIDに使用
      pieces.push({ 
        id, 
        x: Math.random() * 500, 
        y: Math.random() * 500, 
        placed: false, 
        solRow: r, 
        solCol: c,
        season: selectedSeason
      });
      pieceNumber++;
    }
  }
  
  console.log(`[Backend] Seeding ${pieces.length} pieces for season: ${selectedSeason}`);
  
  for (const p of pieces) {
    await store.setPiece(params.matchId, p as any);
  }
}

