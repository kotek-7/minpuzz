"use client";

import { useEffect, useSyncExternalStore } from "react";

type Member = { userId: string; socketId?: string; joinedAt?: string };

class TeamStoreImpl {
  private listeners = new Set<() => void>();
  members = new Map<string, Member>();
  memberCount = 0;
  teamNumber: string | null = null;

  subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  private emit() {
    for (const l of Array.from(this.listeners)) l();
  }
  setMemberCount(n: number) {
    this.memberCount = n;
    this.emit();
  }
  upsertMember(m: Member) {
    this.members.set(m.userId, { ...this.members.get(m.userId), ...m });
    this.emit();
  }
  removeMember(userId: string) {
    this.members.delete(userId);
    this.emit();
  }
  setTeamNumber(num: string) {
    this.teamNumber = num;
    this.emit();
  }
  reset() {
    this.members.clear();
    this.memberCount = 0;
    this.teamNumber = null;
    this.emit();
  }
}

const store = new TeamStoreImpl();

export function useTeamState() {
  const snapshot = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => ({
      memberCount: store.memberCount,
      members: Array.from(store.members.values()),
      teamNumber: store.teamNumber,
    })
  );
  return snapshot;
}

export function useTeamStoreActions() {
  // 依存関係なしの安定参照
  useEffect(() => {}, []);
  return {
    setMemberCount: (n: number) => store.setMemberCount(n),
    upsertMember: (m: Member) => store.upsertMember(m),
    removeMember: (userId: string) => store.removeMember(userId),
    setTeamNumber: (num: string) => store.setTeamNumber(num),
    reset: () => store.reset(),
  };
}

