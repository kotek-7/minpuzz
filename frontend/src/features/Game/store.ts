"use client";

import { useSyncExternalStore, useMemo } from "react";

type Board = { rows: number; cols: number };
type Piece = { id: string; placed?: boolean; row?: number; col?: number };

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
  ended?: boolean;
  // UI用: 表示インデックス(1..N) と server pieceId の対応表
  _displayIndexToId?: Record<number, string>;
  _idToDisplayIndex?: Record<string, number>;
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
    ended: false,
    _displayIndexToId: {},
    _idToDisplayIndex: {},
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

  setMatch(
    matchId: string,
    self?: { teamId: string; memberCount?: number } | null,
    partner?: { teamId: string; memberCount?: number } | null,
  ) {
    this.snapshot = { ...this.snapshot, matchId, self: self ?? null, partner: partner ?? null };
    this.emit();
  }
  hydrateFromInit(p: {
    matchId?: string;
    board: Board;
    pieces: Piece[];
    startedAt?: string | null;
    durationMs?: number | null;
  }) {
    const dict: Record<string, Piece> = {};
    for (const pc of p.pieces) dict[pc.id] = pc;
    
    // 強化された防御ロジック: 不完全なピース配列を無視
    const expectedPieceCount = 25; // 5x5盤面
    const isIncomplete = p.pieces.length < expectedPieceCount;
    const hasExistingComplete = Object.keys(this.snapshot.pieces).length >= expectedPieceCount;
    
    const shouldPreserveExistingPieces = (p.pieces.length === 0 || isIncomplete) && hasExistingComplete;
    const finalPieces = shouldPreserveExistingPieces ? this.snapshot.pieces : dict;
    
    // デバッグログ強化
    if (shouldPreserveExistingPieces) {
      console.log(`[GameStore] Ignoring incomplete game-init (${p.pieces.length} pieces), preserving existing (${Object.keys(this.snapshot.pieces).length} pieces)`);
    } else if (isIncomplete) {
      console.warn(`[GameStore] Accepting incomplete game-init with ${p.pieces.length} pieces (no better existing state)`);
    } else {
      console.log(`[GameStore] Applying complete game-init with ${p.pieces.length} pieces`);
    }
    
    const mapping = this.buildDisplayMapping(Object.keys(finalPieces));
    this.snapshot = {
      ...this.snapshot,
      matchId: p.matchId ?? this.snapshot.matchId,
      board: p.board,
      pieces: finalPieces,
      timer: p.startedAt && p.durationMs ? { startedAt: p.startedAt, durationMs: p.durationMs } : null,
      matchStatus: "READY",
      _displayIndexToId: mapping.indexToId,
      _idToDisplayIndex: mapping.idToIndex,
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
    
    // 強化された防御ロジック: 不完全なstate-syncを無視
    const expectedPieceCount = 25; // 5x5盤面
    const isIncomplete = p.pieces.length < expectedPieceCount;
    const hasExistingComplete = Object.keys(this.snapshot.pieces).length >= expectedPieceCount;
    
    const shouldPreserveExistingPieces = isIncomplete && hasExistingComplete;
    const finalPieces = shouldPreserveExistingPieces ? this.snapshot.pieces : dict;
    
    // デバッグログ強化
    if (shouldPreserveExistingPieces) {
      console.log(`[GameStore] Ignoring incomplete state-sync (${p.pieces.length} pieces), preserving existing (${Object.keys(this.snapshot.pieces).length} pieces)`);
    } else if (isIncomplete) {
      console.warn(`[GameStore] Accepting incomplete state-sync with ${p.pieces.length} pieces (no better existing state)`);
    } else {
      console.log(`[GameStore] Applying complete state-sync with ${p.pieces.length} pieces`);
    }
    
    // 既存マッピングがなければ生成。既にある場合は維持（表示の安定性を優先）
    const hasMapping = this.snapshot._displayIndexToId && Object.keys(this.snapshot._displayIndexToId!).length > 0;
    const mapping = hasMapping
      ? { indexToId: this.snapshot._displayIndexToId!, idToIndex: this.snapshot._idToDisplayIndex! }
      : this.buildDisplayMapping(Object.keys(finalPieces));
      
    // matchStatusの優先度ロジック：startedがtrueの場合はIN_GAMEを維持
    let finalMatchStatus = (p.matchStatus as GameSnapshot["matchStatus"]) || this.snapshot.matchStatus;
    if (this.snapshot.started && finalMatchStatus !== "COMPLETED") {
      finalMatchStatus = "IN_GAME";
      console.log(`[GameStore] Preserving IN_GAME status (received ${p.matchStatus})`);
    }
    
    this.snapshot = {
      ...this.snapshot,
      board: p.board,
      pieces: finalPieces,
      score: { placedByTeam: p.score?.placedByTeam ?? {} },
      timer: p.timer ?? null,
      matchStatus: finalMatchStatus,
      _displayIndexToId: mapping.indexToId,
      _idToDisplayIndex: mapping.idToIndex,
    };
    this.emit();
  }
  private buildDisplayMapping(ids: string[]): { indexToId: Record<number, string>; idToIndex: Record<string, number> } {
    const indexToId: Record<number, string> = {};
    const idToIndex: Record<string, number> = {};
    // 安定化のためソート。25個なら 1..25 に割り当て。
    const sorted = [...ids].sort();
    sorted.forEach((id, i) => {
      const idx = i + 1; // 表示は1始まり
      indexToId[idx] = id;
      idToIndex[id] = idx;
    });
    return { indexToId, idToIndex };
  }
  getPieceIdByDisplayIndex(index: number): string | null {
    const m = this.snapshot._displayIndexToId || {};
    return m[index] ?? null;
  }
  isCellOccupied(row: number, col: number): boolean {
    // 配置済みのピースに同一セルがあるかをチェック
    const pieces = this.snapshot.pieces;
    for (const id in pieces) {
      const p = pieces[id];
      if (p.placed && p.row === row && p.col === col) return true;
    }
    return false;
  }
  markPlaced(pieceId: string, row: number, col: number) {
    const cur = this.snapshot.pieces[pieceId] || { id: pieceId };
    const nextPiece: Piece = { ...cur, placed: true, row, col };
    this.snapshot = {
      ...this.snapshot,
      pieces: { ...this.snapshot.pieces, [pieceId]: nextPiece },
    };
    this.emit();
  }
  setScore(score: { placedByTeam: Record<string, number> }) {
    this.snapshot = { ...this.snapshot, score: { placedByTeam: { ...(score.placedByTeam || {}) } } };
    this.emit();
  }
  applyTimer(p: { startedAt: string | null; durationMs: number | null } | { remainingMs: number }) {
    // 最小仕様: サーバの startedAt/duration を信頼。remainingMs は表示補助に使うなら別途保持。
    if ("remainingMs" in p) {
      // オプション: 必要に応じてローカル側で補助保持（ここでは何もしない）
      this.emit();
      return;
    }
    if (p.startedAt && p.durationMs) {
      this.snapshot = { ...this.snapshot, timer: { startedAt: p.startedAt, durationMs: p.durationMs } };
    } else {
      this.snapshot = { ...this.snapshot, timer: null };
    }
    this.emit();
  }
  finish(input: { reason: string; winnerTeamId: string | null; scores: Record<string, number>; finishedAt: string }) {
    // 最小: 終了フラグとスコア・ステータスのみ反映（reason 等は結果画面で利用可能）
    if (this.snapshot.ended) return;
    this.snapshot = {
      ...this.snapshot,
      ended: true,
      matchStatus: "COMPLETED",
      score: { placedByTeam: { ...input.scores } },
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
  return useSyncExternalStore(
    (cb) => gameStore.subscribe(cb),
    () => gameStore.getSnapshot(),
    () => gameStore.getSnapshot(),
  );
}

export function useGameActions() {
  return useMemo(
    () => ({
      setMatch: (
        matchId: string,
        self?: { teamId: string; memberCount?: number } | null,
        partner?: { teamId: string; memberCount?: number } | null,
      ) => gameStore.setMatch(matchId, self, partner),
      hydrateFromInit: (p: {
        matchId?: string;
        board: Board;
        pieces: Piece[];
        startedAt?: string | null;
        durationMs?: number | null;
      }) => gameStore.hydrateFromInit(p),
      applyStateSync: (p: {
        board: Board;
        pieces: Piece[];
        score: { placedByTeam: Record<string, number> };
        timer?: { startedAt: string; durationMs: number } | null;
        matchStatus?: string;
      }) => gameStore.applyStateSync(p),
      markStarted: () => gameStore.markStarted(),
      markPlaced: (pieceId: string, row: number, col: number) => gameStore.markPlaced(pieceId, row, col),
      setScore: (s: { placedByTeam: Record<string, number> }) => gameStore.setScore(s),
      applyTimer: (t: { startedAt: string | null; durationMs: number | null } | { remainingMs: number }) =>
        gameStore.applyTimer(t as any),
      finish: (i: {
        reason: string;
        winnerTeamId: string | null;
        scores: Record<string, number>;
        finishedAt: string;
      }) => gameStore.finish(i),
      getPieceIdByDisplayIndex: (index: number) => gameStore.getPieceIdByDisplayIndex(index),
      isCellOccupied: (row: number, col: number) => gameStore.isCellOccupied(row, col),
    }),
    [],
  );
}
