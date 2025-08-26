// マッチング領域の純粋な型定義
// 目的: ドメイン結果とルールをIOから切り離し、テスト容易性と拡張性を確保する
// ポイント: 公平性のためFIFO、健全性のためTTLを前提に設計（理由の明示に留め、実装詳細は持ち込まない）

import type { MatchingTeamInfo } from "../team/types.js";

export type TeamId = string;

// マッチ識別子（生成はアプリケーション層で行う）
export type MatchId = string;

// マッチング時のルール設定
export type MatchingRules = {
  // 待機情報の有効期限（ミリ秒）。健全性維持（ゾンビ待機の除去）のため必須
  ttlMs: number;
  // 将来拡張: チーム人数の完全一致を要求
  requireEqualSize?: boolean;
  // 将来拡張: 許容する人数差の上限
  maxSizeDelta?: number;
};

// サービスが返す最小結果ADT: 待機継続か、マッチ成立か
export type QueueJoinResult =
  | { type: "waiting"; self: MatchingTeamInfo }
  | { type: "found"; matchId: MatchId; self: MatchingTeamInfo; partner: MatchingTeamInfo };

// マッチのライフサイクル（必要最小限。後続フェーズで拡張）
export enum MatchStatus {
  FOUND = "FOUND",         // 対戦組成が確定した直後
  PREPARING = "PREPARING", // ゲーム開始前の準備（部屋接続待ち等）
  READY = "READY",         // 全参加者準備完了（gameStart直前）
}

export type MatchTeamSide = {
  teamId: TeamId;
  memberCount: number;
};

export type Match = {
  id: MatchId;
  teamA: MatchTeamSide;
  teamB: MatchTeamSide;
  createdAt: string; // ISO8601
  status: MatchStatus;
};

// 利用スケッチ（実装は後続ステップ）
// - QueueJoinResult: MatchingService.joinQueue の戻り値
// - Match: 成立後の永続/キャッシュ対象候補とし、ゲーム準備フェーズの基礎データに使用

