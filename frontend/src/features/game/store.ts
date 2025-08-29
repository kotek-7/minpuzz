"use client";

import { useSyncExternalStore, useMemo } from "react";

type Board = { rows: number; cols: number };
type Piece = { id: string; x: number; y: number; placed?: boolean; row?: number; col?: number; holder?: string };

type GameSnapshot = {
  matchId: string | null;
  self?: { teamId: string; memberCount?: number } | null;
  partner?: { teamId: string; memberCount?: number } | null;
  board: Board | null;
  pieces: Record<string, Piece>;
  score: { placedByTeam: Record<string, number> } | null;
  timer: { startedAt: string; durationMs: number } | null;
  matchStatus: "PREPARING" | "READY" | "IN_GAME" | "COMPLETED" | "UNKNOWN";
  started: boolean;
};

class GameStoreImpl {
  private listeners = new Set<() => void>();
  private snapshot: GameSnapshot = {
    matchId: null,
    self: null,
    partner: null,
    board: null,
    pieces: {},
    score: { placedByTeam: {} },
    timer: null,
    matchStatus: "PREPARING",
    started: false,
  };

  subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  private emit() {
    for (const l of Array.from(this.listeners)) l();
  }
  getSnapshot(): GameSnapshot {
    return this.snapshot;
  }

  setMatch(matchId: string, self?: { teamId: string; memberCount?: number } | null, partner?: { teamId: string; memberCount?: number } | null) {
    this.snapshot = { ...this.snapshot, matchId, self: self ?? null, partner: partner ?? null };
    this.emit();
  }
  hydrateFromInit(p: { matchId?: string; board: Board; pieces: Piece[]; startedAt?: string | null; durationMs?: number | null }) {
    const dict: Record<string, Piece> = {};
    for (const pc of p.pieces) dict[pc.id] = pc;
    this.snapshot = {
      ...this.snapshot,
      matchId: p.matchId ?? this.snapshot.matchId,
      board: p.board,
      pieces: dict,
      timer: p.startedAt && p.durationMs ? { startedAt: p.startedAt, durationMs: p.durationMs } : null,
      matchStatus: "READY",
    };
    this.emit();
  }
  applyStateSync(p: { board: Board; pieces: Piece[]; score: { placedByTeam: Record<string, number> }; timer?: { startedAt: string; durationMs: number } | null; matchStatus?: string }) {
    const dict: Record<string, Piece> = {};
    for (const pc of p.pieces) dict[pc.id] = pc;
    this.snapshot = {
      ...this.snapshot,
      board: p.board,
      pieces: dict,
      score: { placedByTeam: p.score?.placedByTeam ?? {} },
      timer: p.timer ?? null,
      matchStatus: (p.matchStatus as GameSnapshot["matchStatus"]) || this.snapshot.matchStatus,
    };
    this.emit();
  }
  markStarted() {
    if (this.snapshot.started) return;
    this.snapshot = { ...this.snapshot, started: true, matchStatus: "IN_GAME" };
    this.emit();
  }
}

const gameStore = new GameStoreImpl();

export function useGameState() {
  return useSyncExternalStore((cb) => gameStore.subscribe(cb), () => gameStore.getSnapshot(), () => gameStore.getSnapshot());
}

export function useGameActions() {
  return useMemo(
    () => ({
      setMatch: (matchId: string, self?: { teamId: string; memberCount?: number } | null, partner?: { teamId: string; memberCount?: number } | null) =>
        gameStore.setMatch(matchId, self, partner),
      hydrateFromInit: (p: { matchId?: string; board: Board; pieces: Piece[]; startedAt?: string | null; durationMs?: number | null }) =>
        gameStore.hydrateFromInit(p),
      applyStateSync: (p: { board: Board; pieces: Piece[]; score: { placedByTeam: Record<string, number> }; timer?: { startedAt: string; durationMs: number } | null; matchStatus?: string }) =>
        gameStore.applyStateSync(p),
      markStarted: () => gameStore.markStarted(),
    }),
    []
  );
}

