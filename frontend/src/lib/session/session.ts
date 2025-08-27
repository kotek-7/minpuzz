"use client";

// セッション情報を localStorage に保持・取得するユーティリティ。
// SSRガードを行い、クライアント側でのみ永続化します。

const KEY_USER_ID = "mp:userId";
const KEY_NICKNAME = "mp:nickname";
const KEY_TEAM_ID = "mp:teamId";
const KEY_TEAM_NUMBER = "mp:teamNumber";

function isClient() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getOrCreateUserId(): string {
  if (!isClient()) return "anonymous";
  let id = localStorage.getItem(KEY_USER_ID);
  if (!id) {
    const rnd = (globalThis.crypto as any)?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    id = String(rnd);
    localStorage.setItem(KEY_USER_ID, id);
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

