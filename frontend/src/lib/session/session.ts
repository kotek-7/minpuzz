"use client";

// セッション情報の保持・取得ユーティリティ。
// userId は sessionStorage、その他は localStorage を使用します。
// SSRガードを行い、クライアント側でのみ永続化します。

const KEY_USER_ID = "mp:userId";
const KEY_NICKNAME = "mp:nickname";
const KEY_TEAM_ID = "mp:teamId";
const KEY_TEAM_NUMBER = "mp:teamNumber";

function isClient() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getOrCreateUserId(): string {
  // userId は sessionStorage 管理（タブ/セッション単位）
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") return "anonymous";
  let id = sessionStorage.getItem(KEY_USER_ID);
  if (!id) {
    const rnd = (globalThis.crypto as any)?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    id = String(rnd);
    sessionStorage.setItem(KEY_USER_ID, id);
  }
  return id;
}

export function getNickname(): string | null {
  if (!isClient()) return null;
  return localStorage.getItem(KEY_NICKNAME);
}

export function setNickname(nickname: string) {
  if (!isClient()) return;
  localStorage.setItem(KEY_NICKNAME, nickname);
}

export function getTeamId(): string | null {
  if (!isClient()) return null;
  return localStorage.getItem(KEY_TEAM_ID);
}

export function setTeamId(teamId: string) {
  if (!isClient()) return;
  localStorage.setItem(KEY_TEAM_ID, teamId);
}

export function getTeamNumber(): string | null {
  if (!isClient()) return null;
  return localStorage.getItem(KEY_TEAM_NUMBER);
}

export function setTeamNumber(teamNumber: string) {
  if (!isClient()) return;
  localStorage.setItem(KEY_TEAM_NUMBER, teamNumber);
}

export function clearTeam() {
  if (!isClient()) return;
  localStorage.removeItem(KEY_TEAM_ID);
  localStorage.removeItem(KEY_TEAM_NUMBER);
}
