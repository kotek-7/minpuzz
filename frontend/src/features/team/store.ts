"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

type Member = { userId: string; socketId?: string; joinedAt?: string };
type TeamSnapshot = {
  memberCount: number;
  members: Member[];
  teamNumber: string | null;
};

class TeamStoreImpl {
  private listeners = new Set<() => void>();
  members = new Map<string, Member>();
  memberCount = 0;
  teamNumber: string | null = null;
  private snapshot: TeamSnapshot = { memberCount: 0, members: [], teamNumber: null };

  subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  private emit() {
    for (const l of Array.from(this.listeners)) l();
  }
  private recomputeSnapshot() {
    // members配列はここでのみ再生成し、参照を安定化する
    this.snapshot = {
      memberCount: this.memberCount,
      members: Array.from(this.members.values()),
      teamNumber: this.teamNumber,
    };
  }
  getSnapshot(): TeamSnapshot {
    return this.snapshot;
  }
  setMemberCount(n: number) {
    this.memberCount = n;
    this.recomputeSnapshot();
    this.emit();
  }
  upsertMember(m: Member) {
    this.members.set(m.userId, { ...this.members.get(m.userId), ...m });
    this.recomputeSnapshot();
    this.emit();
  }
  removeMember(userId: string) {
    this.members.delete(userId);
    this.recomputeSnapshot();
    this.emit();
  }
  setTeamNumber(num: string) {
    this.teamNumber = num;
    this.recomputeSnapshot();
    this.emit();
  }
  reset() {
    this.members.clear();
    this.memberCount = 0;
    this.teamNumber = null;
    this.recomputeSnapshot();
    this.emit();
  }
}

const store = new TeamStoreImpl();

export function useTeamState() {
  const getSnapshot = () => store.getSnapshot();
  // SSR用のサーバースナップショット（初期値）。
  // React 19 + Next 15 では第3引数が必須。
  const getServerSnapshot = () => store.getSnapshot();

  const snapshot = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    getSnapshot,
    getServerSnapshot
  );
  return snapshot;
}

export function useTeamStoreActions() {
  // 安定参照で返す（ハンドラの依存配列が増えても再生成されない）
  const actions = useMemo(
    () => ({
      setMemberCount: (n: number) => store.setMemberCount(n),
      upsertMember: (m: Member) => store.upsertMember(m),
      removeMember: (userId: string) => store.removeMember(userId),
      setTeamNumber: (num: string) => store.setTeamNumber(num),
      reset: () => store.reset(),
    }),
    []
  );
  return actions;
}
