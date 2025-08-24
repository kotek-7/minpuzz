import { Result, ok, err } from "neverthrow";
import { RedisClient } from "../shared/redisClient.js";
import { redisKeys } from "../shared/redisKeys.js";

export const getTeamRoom = (teamId: string): string => `team:${teamId}`;

export const addSocketUserMapping = async (
  redis: RedisClient,
  socketId: string, 
  userId: string
): Promise<Result<void, string>> => {
  try {
    // 同一ユーザーの重複接続防止：既存接続を自動切断
    const existingSocketResult = await redis.get(redisKeys.userToSocket(userId));
    if (existingSocketResult.isOk() && existingSocketResult.value) {
      await redis.delete(redisKeys.socketToUser(existingSocketResult.value));
    }

    // 24時間TTLでセッション管理（切断時の自動クリーンアップ）
    const socketSetResult = await redis.set(redisKeys.socketToUser(socketId), userId, 86400);
    const userSetResult = await redis.set(redisKeys.userToSocket(userId), socketId, 86400);

    if (socketSetResult.isErr()) return err(socketSetResult.error);
    if (userSetResult.isErr()) return err(userSetResult.error);

    return ok();
  } catch (error) {
    return err(`Failed to add socket mapping: ${error}`);
  }
};

export const removeSocketUserMapping = async (
  redis: RedisClient,
  socketId: string
): Promise<Result<string | null, string>> => {
  try {
    const userResult = await redis.get(redisKeys.socketToUser(socketId));
    if (userResult.isErr()) return userResult;
    
    const userId = userResult.value;
    if (userId) {
      await redis.delete(redisKeys.socketToUser(socketId));
      await redis.delete(redisKeys.userToSocket(userId));
      return ok(userId);
    }
    
    return ok(null);
  } catch (error) {
    return err(`Failed to remove socket mapping: ${error}`);
  }
};

export const getUserBySocketId = async (
  redis: RedisClient,
  socketId: string
): Promise<Result<string | null, string>> => {
  return redis.get(redisKeys.socketToUser(socketId));
};

export const getSocketIdByUserId = async (
  redis: RedisClient,
  userId: string
): Promise<Result<string | null, string>> => {
  return redis.get(redisKeys.userToSocket(userId));
};