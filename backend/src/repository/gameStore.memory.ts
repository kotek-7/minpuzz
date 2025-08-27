import { ok, err, Result } from "neverthrow";
import type { GameStore, StoreError } from "./gameStore.js";
import type { MatchRecord, Piece, Score, Timer } from "../model/game/types.js";

type Expiring<T> = { value: T; expiresAt?: number };

function now(): number { return Date.now(); }

export class InMemoryGameStore implements GameStore {
  private matches = new Map<string, Expiring<MatchRecord>>();
  private connections = new Map<string, Set<string>>(); // key: `${matchId}|${teamId}`
  private pieces = new Map<string, Map<string, Piece>>(); // matchId -> (pieceId -> Piece)
  private locks = new Map<string, { holder: string; expiresAt: number }>(); // key: `${matchId}|${pieceId}`
  private scores = new Map<string, Map<string, number>>(); // matchId -> (teamId -> placed)
  private timers = new Map<string, Timer>(); // matchId -> timer

  // match
  async getMatch(id: string): Promise<Result<MatchRecord | null, StoreError>> {
    const rec = this.matches.get(id);
    if (!rec) return ok(null);
    if (rec.expiresAt && rec.expiresAt < now()) {
      this.matches.delete(id);
      return ok(null);
    }
    return ok(rec.value);
  }

  async setMatch(id: string, record: MatchRecord, ttlSec?: number): Promise<Result<true, StoreError>> {
    const expiresAt = ttlSec ? now() + ttlSec * 1000 : undefined;
    this.matches.set(id, { value: record, expiresAt });
    return ok(true as const);
  }

  // connections
  private connKey(matchId: string, teamId: string): string { return `${matchId}|${teamId}`; }

  async addConnection(matchId: string, teamId: string, userId: string): Promise<Result<true, StoreError>> {
    const key = this.connKey(matchId, teamId);
    const set = this.connections.get(key) ?? new Set<string>();
    set.add(userId);
    this.connections.set(key, set);
    return ok(true as const);
  }

  async listConnections(matchId: string, teamId: string): Promise<Result<string[], StoreError>> {
    const key = this.connKey(matchId, teamId);
    const set = this.connections.get(key);
    return ok(Array.from(set ?? []));
  }

  // pieces
  async getPiece(matchId: string, pieceId: string): Promise<Result<Piece | null, StoreError>> {
    const m = this.pieces.get(matchId);
    const p = m?.get(pieceId) ?? null;
    return ok(p);
  }

  async setPiece(matchId: string, piece: Piece): Promise<Result<true, StoreError>> {
    if (piece.placed && (piece.row === undefined || piece.col === undefined)) {
      return err("invalid");
    }
    const m = this.pieces.get(matchId) ?? new Map<string, Piece>();
    m.set(piece.id, piece);
    this.pieces.set(matchId, m);
    return ok(true as const);
  }

  async listPieces(matchId: string): Promise<Result<Piece[], StoreError>> {
    const m = this.pieces.get(matchId);
    return ok(m ? Array.from(m.values()) : []);
  }

  // piece lock
  private lockKey(matchId: string, pieceId: string): string { return `${matchId}|${pieceId}`; }

  async acquirePieceLock(matchId: string, pieceId: string, userId: string, ttlSec: number): Promise<Result<true, StoreError>> {
    const key = this.lockKey(matchId, pieceId);
    const nowMs = now();
    const current = this.locks.get(key);
    if (current && current.expiresAt > nowMs && current.holder !== userId) {
      return err("conflict");
    }
    this.locks.set(key, { holder: userId, expiresAt: nowMs + ttlSec * 1000 });
    return ok(true as const);
  }

  async releasePieceLock(matchId: string, pieceId: string, userId: string): Promise<Result<true, StoreError>> {
    const key = this.lockKey(matchId, pieceId);
    const current = this.locks.get(key);
    if (!current) return err("notFound");
    if (current.holder !== userId) return err("conflict");
    this.locks.delete(key);
    return ok(true as const);
  }

  // score
  private ensureScoreMap(matchId: string): Map<string, number> {
    const m = this.scores.get(matchId) ?? new Map<string, number>();
    if (!this.scores.has(matchId)) this.scores.set(matchId, m);
    return m;
  }

  async getScore(matchId: string): Promise<Result<Score, StoreError>> {
    const m = this.scores.get(matchId) ?? new Map<string, number>();
    const placedByTeam: Record<string, number> = {};
    for (const [teamId, n] of m.entries()) placedByTeam[teamId] = n;
    return ok({ placedByTeam });
  }

  async incrTeamPlaced(matchId: string, teamId: string): Promise<Result<number, StoreError>> {
    const m = this.ensureScoreMap(matchId);
    const next = (m.get(teamId) ?? 0) + 1;
    m.set(teamId, next);
    return ok(next);
  }

  async setPlaced(matchId: string, teamId: string, n: number): Promise<Result<number, StoreError>> {
    if (!Number.isInteger(n) || n < 0) return err("invalid");
    const m = this.ensureScoreMap(matchId);
    m.set(teamId, n);
    return ok(n);
  }

  // timer
  async getTimer(matchId: string): Promise<Result<Timer | null, StoreError>> {
    return ok(this.timers.get(matchId) ?? null);
  }

  async setTimer(matchId: string, timer: Timer): Promise<Result<true, StoreError>> {
    if (!timer.startedAt || !Number.isInteger(timer.durationMs) || timer.durationMs <= 0) {
      return err("invalid");
    }
    this.timers.set(matchId, timer);
    return ok(true as const);
  }
}

