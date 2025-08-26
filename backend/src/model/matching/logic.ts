// マッチ相手選定の純関数群
// 目的: I/Oに依存しない中核ロジック（FIFOの公平性・TTLによる健全性・決定的なtie-break）を提供する

import type { MatchingTeamInfo } from "../team/types.js";
import type { MatchingRules } from "./types.js";

const toMillis = (d: Date | string): number => (typeof d === "string" ? Date.parse(d) : d.getTime());

// ゾンビ待機や不正データの混入を防ぐための期限判定
export const isExpired = (info: MatchingTeamInfo, now: Date, ttlMs: number): boolean => {
  const joinedAtMs = toMillis(info.joinedAt);
  const nowMs = now.getTime();
  if (!Number.isFinite(joinedAtMs)) return true; // 不正な日時は無効扱い
  if (joinedAtMs > nowMs) return true; // 未来日時は無効扱い
  return joinedAtMs + ttlMs < nowMs;
};

// 期限切れの除外と昇順整列（重複teamIdは最古のみ残す）
export const cleanupAndSortQueue = (
  queue: MatchingTeamInfo[],
  now: Date,
  ttlMs: number
): { valid: MatchingTeamInfo[]; expiredIds: string[] } => {
  const expiredIds: string[] = [];
  const validRaw: MatchingTeamInfo[] = [];

  for (const info of queue) {
    if (isExpired(info, now, ttlMs)) {
      expiredIds.push(info.teamId);
    } else {
      validRaw.push(info);
    }
  }

  // joinedAt昇順 → tie-breakはteamId昇順（決定性のため）
  validRaw.sort((a, b) => {
    const da = toMillis(a.joinedAt);
    const db = toMillis(b.joinedAt);
    if (da !== db) return da - db;
    return a.teamId < b.teamId ? -1 : a.teamId > b.teamId ? 1 : 0;
  });

  // 同一teamIdの重複は最古のみ温存
  const seen = new Set<string>();
  const valid: MatchingTeamInfo[] = [];
  for (const v of validRaw) {
    if (seen.has(v.teamId)) continue;
    seen.add(v.teamId);
    valid.push(v);
  }

  return { valid, expiredIds };
};

// 将来の拡張（人数一致/差分許容等）を集約し、見通しの良い条件判定を保つ
export const canMatch = (
  self: MatchingTeamInfo,
  other: MatchingTeamInfo,
  rules: MatchingRules
): boolean => {
  if (self.teamId === other.teamId) return false; // 自己除外（必須）

  if (rules.requireEqualSize) {
    if (self.memberCount !== other.memberCount) return false;
  }

  if (typeof rules.maxSizeDelta === "number") {
    if (Math.abs(self.memberCount - other.memberCount) > rules.maxSizeDelta) return false;
  }

  return true;
};

// FIFOで最古の適合相手を選ぶ（入力はcleanupAndSortQueue済み前提）
export const selectPartnerFIFO = (
  self: MatchingTeamInfo,
  candidates: MatchingTeamInfo[],
  rules: MatchingRules
): MatchingTeamInfo | null => {
  for (const c of candidates) {
    if (canMatch(self, c, rules)) return c;
  }
  return null;
};

// Service層向けの合成: クリーンアップすべきIDと、FIFOでの相手選定結果を同時に返す
export const planPartner = (
  self: MatchingTeamInfo,
  queue: MatchingTeamInfo[],
  now: Date,
  rules: MatchingRules
): { partner: MatchingTeamInfo | null; expiredIds: string[]; valid: MatchingTeamInfo[] } => {
  const { valid, expiredIds } = cleanupAndSortQueue(queue, now, rules.ttlMs);
  const candidates = valid.filter(v => v.teamId !== self.teamId);
  const partner = selectPartnerFIFO(self, candidates, rules);
  return { partner, expiredIds, valid };
};
