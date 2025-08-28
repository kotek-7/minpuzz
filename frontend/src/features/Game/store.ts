"use client";

import { useSyncExternalStore, useMemo } from "react";

type Board = { rows: number; cols: number };
type Piece = { 
  id: string; 
  x: number; 
  y: number; 
  placed?: boolean; 
  row?: number; 
  col?: number; 
  holder?: string;
  solRow?: number;
  solCol?: number;
  season?: string; // 季節情報（spring, summer, autumn, winter）
};

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
  gameEnded: boolean;
  winnerTeamId: string | null;
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
    gameEnded: false,
    winnerTeamId: null,
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
  
  hydrateFromInit(p: { 
    matchId?: string; 
    board: Board; 
    pieces: Piece[]; 
    startedAt?: string | null; 
    durationMs?: number | null;
    myUserId?: string;
  }) {
    const dict: Record<string, Piece> = {};
    for (const pc of p.pieces) dict[pc.id] = pc;
    
    this.snapshot = {
      ...this.snapshot,
      matchId: p.matchId ?? this.snapshot.matchId,
      board: p.board,
      pieces: dict,
      timer: p.startedAt && p.durationMs ? { startedAt: p.startedAt, durationMs: p.durationMs } : null,
      matchStatus: "READY",
      gameEnded: false,
      winnerTeamId: null,
    };
    this.emit();
  }
  
  applyStateSync(p: { 
    board: Board; 
    pieces: Piece[]; 
    score: { placedByTeam: Record<string, number> }; 
    timer?: { startedAt: string; durationMs: number } | null; 
    matchStatus?: string;
  }) {
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

  updatePiece(pieceId: string, updates: Partial<Piece>) {
    const piece = this.snapshot.pieces[pieceId];
    if (!piece) return;
    
    this.snapshot = {
      ...this.snapshot,
      pieces: {
        ...this.snapshot.pieces,
        [pieceId]: { ...piece, ...updates }
      }
    };
    this.emit();
  }

  updateScore(score: { placedByTeam: Record<string, number> }) {
    this.snapshot = {
      ...this.snapshot,
      score
    };
    this.emit();
  }

  updateTimer(timer: { startedAt: string; durationMs: number } | null) {
    this.snapshot = {
      ...this.snapshot,
      timer
    };
    this.emit();
  }

  endGame(winnerTeamId: string | null, scores: Record<string, number>) {
    this.snapshot = {
      ...this.snapshot,
      gameEnded: true,
      winnerTeamId,
      score: { placedByTeam: scores },
      matchStatus: "COMPLETED"
    };
    this.emit();
  }

  reset() {
    this.snapshot = {
      matchId: null,
      self: null,
      partner: null,
      board: null,
      pieces: {},
      score: { placedByTeam: {} },
      timer: null,
      matchStatus: "PREPARING",
      started: false,
      gameEnded: false,
      winnerTeamId: null,
    };
    this.emit();
  }
}

const gameStore = new GameStoreImpl();

export function useGameState() {
  return useSyncExternalStore(
    (cb) => gameStore.subscribe(cb), 
    () => gameStore.getSnapshot(), 
    () => gameStore.getSnapshot()
  );
}

export function useGameActions() {
  return useMemo(
    () => ({
      setMatch: (matchId: string, self?: { teamId: string; memberCount?: number } | null, partner?: { teamId: string; memberCount?: number } | null) =>
        gameStore.setMatch(matchId, self, partner),
      hydrateFromInit: (p: { 
        matchId?: string; 
        board: Board; 
        pieces: Piece[]; 
        startedAt?: string | null; 
        durationMs?: number | null;
        myUserId?: string;
      }) => gameStore.hydrateFromInit(p),
      applyStateSync: (p: { 
        board: Board; 
        pieces: Piece[]; 
        score: { placedByTeam: Record<string, number> }; 
        timer?: { startedAt: string; durationMs: number } | null; 
        matchStatus?: string;
      }) => gameStore.applyStateSync(p),
      markStarted: () => gameStore.markStarted(),
      updatePiece: (pieceId: string, updates: Partial<Piece>) => gameStore.updatePiece(pieceId, updates),
      updateScore: (score: { placedByTeam: Record<string, number> }) => gameStore.updateScore(score),
      updateTimer: (timer: { startedAt: string; durationMs: number } | null) => gameStore.updateTimer(timer),
      endGame: (winnerTeamId: string | null, scores: Record<string, number>) => gameStore.endGame(winnerTeamId, scores),
      reset: () => gameStore.reset(),
    }),
    []
  );
}

