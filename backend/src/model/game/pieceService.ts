import { err, ok, Result } from 'neverthrow';
import type { GameStore, StoreError } from '../../repository/gameStore.js';
import type { Piece } from './types.js';
import { canPlace } from './pieceGuards.js';

export type PlaceError = 'notFound' | 'placed' | 'invalidCell' | 'io';

export async function place(
  store: GameStore,
  params: { matchId: string; pieceId: string; userId: string; teamId: string; row: number; col: number }
): Promise<Result<Piece, PlaceError>> {
  // クリック配置版: holder/lock なし、セル占有チェックのみ
  const pieceRes = await store.getPiece(params.matchId, params.pieceId);
  if (pieceRes.isErr()) return err('io');
  const guarded = canPlace(pieceRes.value, params.row, params.col);
  if (guarded.isErr()) return err(guarded.error);

  // セル占有チェック（同一チーム内での重複配置を防止）
  const listR = await store.listPieces(params.matchId);
  if (listR.isErr()) return err('io');
  
  // 指定されたセルに配置されているピース（自分以外）を取得
  const cellPieces = listR.value.filter((p) => 
    p.placed && 
    p.row === params.row && 
    p.col === params.col && 
    p.id !== params.pieceId  // 自分自身は除外
  );
  
  // 同じセルに配置されているピースがある場合
  if (cellPieces.length > 0) {
    // 現在の実装では、ピース→チーム の対応付けができないため
    // 暫定的に同じセルへの重複配置を許可（相手チームのピースとも重複可能）
    // 将来的にはピースの所有チーム情報を追加して、同一チーム内のみ禁止する
    console.log(`[PieceService] Allowing overlapping placement at (${params.row}, ${params.col}) - multiple teams can place on same cell`);
  }

  const next: Piece = { ...guarded.value, placed: true, row: params.row, col: params.col };
  const setR = await store.setPiece(params.matchId, next);
  if (setR.isErr()) return err('io');
  return ok(next);
}
