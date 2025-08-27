import type { Result } from "neverthrow";
import type { MatchRecord, Piece, Timer, Score } from "../model/game/types.js";

export type StoreError = "notFound" | "conflict" | "invalid" | "io";

export interface GameStore {
  // match
  getMatch(id: string): Promise<Result<MatchRecord | null, StoreError>>;
  setMatch(id: string, record: MatchRecord, ttlSec?: number): Promise<Result<true, StoreError>>;

  // connections
  addConnection(matchId: string, teamId: string, userId: string): Promise<Result<true, StoreError>>;
  listConnections(matchId: string, teamId: string): Promise<Result<string[], StoreError>>;

  // pieces
  getPiece(matchId: string, pieceId: string): Promise<Result<Piece | null, StoreError>>;
  setPiece(matchId: string, piece: Piece): Promise<Result<true, StoreError>>;
  listPieces(matchId: string): Promise<Result<Piece[], StoreError>>;

  // piece lock
  acquirePieceLock(
    matchId: string,
    pieceId: string,
    userId: string,
    ttlSec: number
  ): Promise<Result<true, StoreError>>;
  releasePieceLock(
    matchId: string,
    pieceId: string,
    userId: string
  ): Promise<Result<true, StoreError>>;

  // score
  getScore(matchId: string): Promise<Result<Score, StoreError>>;
  incrTeamPlaced(matchId: string, teamId: string): Promise<Result<number, StoreError>>; // returns new value
  setPlaced(matchId: string, teamId: string, n: number): Promise<Result<number, StoreError>>;

  // timer
  getTimer(matchId: string): Promise<Result<Timer | null, StoreError>>;
  setTimer(matchId: string, timer: Timer): Promise<Result<true, StoreError>>;
}

