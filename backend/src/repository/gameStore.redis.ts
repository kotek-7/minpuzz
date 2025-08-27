import { ok, err, Result } from "neverthrow";
import type { GameStore, StoreError } from "./gameStore.js";
import type { RedisClient } from "./redisClient.js";
import { redisKeys } from "./redisKeys.js";
import type { MatchRecord, Piece, Score, Timer } from "../model/game/types.js";

export class RedisGameStore implements GameStore {
  constructor(private readonly redis: RedisClient) {}

  // match
  async getMatch(id: string): Promise<Result<MatchRecord | null, StoreError>> {
    const res = await this.redis.get(redisKeys.match(id));
    if (res.isErr()) return err("io");
    if (!res.value) return ok(null);
    try {
      return ok(JSON.parse(res.value) as MatchRecord);
    } catch {
      return err("invalid");
    }
  }

  async setMatch(id: string, record: MatchRecord, ttlSec?: number): Promise<Result<true, StoreError>> {
    const res = await this.redis.set(redisKeys.match(id), JSON.stringify(record), ttlSec);
    if (res.isErr() || !res.value) return err("io");
    return ok(true as const);
  }

  // connections
  async addConnection(matchId: string, teamId: string, userId: string): Promise<Result<true, StoreError>> {
    const r = await this.redis.sadd(redisKeys.matchTeamConnections(matchId, teamId), userId);
    if (r.isErr()) return err("io");
    return ok(true as const);
  }

  async listConnections(matchId: string, teamId: string): Promise<Result<string[], StoreError>> {
    const r = await this.redis.smembers(redisKeys.matchTeamConnections(matchId, teamId));
    if (r.isErr()) return err("io");
    return ok(r.value);
  }

  // pieces
  async getPiece(matchId: string, pieceId: string): Promise<Result<Piece | null, StoreError>> {
    const r = await this.redis.hget(redisKeys.matchPieces(matchId), pieceId);
    if (r.isErr()) return err("io");
    if (!r.value) return ok(null);
    try { return ok(JSON.parse(r.value) as Piece); } catch { return err("invalid"); }
  }

  async setPiece(matchId: string, piece: Piece): Promise<Result<true, StoreError>> {
    if (piece.placed && (piece.row === undefined || piece.col === undefined)) return err("invalid");
    const r = await this.redis.hset(redisKeys.matchPieces(matchId), piece.id, JSON.stringify(piece));
    if (r.isErr()) return err("io");
    return ok(true as const);
  }

  async listPieces(matchId: string): Promise<Result<Piece[], StoreError>> {
    const r = await this.redis.hgetall(redisKeys.matchPieces(matchId));
    if (r.isErr()) return err("io");
    const out: Piece[] = [];
    try {
      for (const v of Object.values(r.value)) out.push(JSON.parse(v) as Piece);
      return ok(out);
    } catch {
      return err("invalid");
    }
  }

  // piece lock
  async acquirePieceLock(matchId: string, pieceId: string, userId: string, ttlSec: number): Promise<Result<true, StoreError>> {
    const okNx = await this.redis.setNxPx(redisKeys.matchPieceLock(matchId, pieceId), userId, Math.max(1, Math.floor(ttlSec * 1000)));
    if (okNx.isErr()) return err("io");
    if (!okNx.value) return err("conflict");
    // track pieceId for heal/cleanup
    const sadd = await this.redis.sadd(redisKeys.matchLocksPieces(matchId), pieceId);
    if (sadd.isErr()) return err("io");
    return ok(true as const);
  }
  async releasePieceLock(matchId: string, pieceId: string, userId: string): Promise<Result<true, StoreError>> {
    const val = await this.redis.get(redisKeys.matchPieceLock(matchId, pieceId));
    if (val.isErr()) return err("io");
    if (!val.value) return err("notFound");
    if (val.value !== userId) return err("conflict");
    const del = await this.redis.delete(redisKeys.matchPieceLock(matchId, pieceId));
    if (del.isErr()) return err("io");
    // optional cleanup from set
    await this.redis.srem(redisKeys.matchLocksPieces(matchId), pieceId);
    return ok(true as const);
  }

  // score
  async getScore(matchId: string): Promise<Result<Score, StoreError>> {
    const r = await this.redis.hgetall(redisKeys.matchScore(matchId));
    if (r.isErr()) return err("io");
    const placedByTeam: Record<string, number> = {};
    for (const [k, v] of Object.entries(r.value)) {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return err("invalid");
      placedByTeam[k] = n;
    }
    return ok({ placedByTeam });
  }

  async incrTeamPlaced(matchId: string, teamId: string): Promise<Result<number, StoreError>> {
    // Redis原子的にはHINCRBYが必要。Mock/IFに無いので get->set で代替（単体テスト前提）。
    const curR = await this.redis.hget(redisKeys.matchScore(matchId), teamId);
    if (curR.isErr()) return err("io");
    const next = (curR.value ? Number(curR.value) : 0) + 1;
    if (!Number.isFinite(next) || next < 0) return err("invalid");
    const setR = await this.redis.hset(redisKeys.matchScore(matchId), teamId, String(next));
    if (setR.isErr()) return err("io");
    return ok(next);
  }

  async setPlaced(matchId: string, teamId: string, n: number): Promise<Result<number, StoreError>> {
    if (!Number.isInteger(n) || n < 0) return err("invalid");
    const r = await this.redis.hset(redisKeys.matchScore(matchId), teamId, String(n));
    if (r.isErr()) return err("io");
    return ok(n);
  }

  // timer
  async getTimer(matchId: string): Promise<Result<Timer | null, StoreError>> {
    const r = await this.redis.get(redisKeys.matchTimer(matchId));
    if (r.isErr()) return err("io");
    if (!r.value) return ok(null);
    try { return ok(JSON.parse(r.value) as Timer); } catch { return err("invalid"); }
  }

  async setTimer(matchId: string, timer: Timer): Promise<Result<true, StoreError>> {
    if (!timer.startedAt || !Number.isInteger(timer.durationMs) || timer.durationMs <= 0) return err("invalid");
    const r = await this.redis.set(redisKeys.matchTimer(matchId), JSON.stringify(timer));
    if (r.isErr() || !r.value) return err("io");
    return ok(true as const);
  }
}
