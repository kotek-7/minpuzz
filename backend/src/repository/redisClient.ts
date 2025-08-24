import { Result } from "neverthrow";
import { RedisHashKey, RedisKey, RedisListKey, RedisSetKey, RedisStringKey } from "./redisKeyTypes";

// Redis client interface
export interface RedisClient {
  set(key: RedisStringKey, value: string, ttl?: number): Promise<Result<boolean, string>>;
  get(key: RedisStringKey): Promise<Result<string | null, string>>;
  delete(key: RedisKey): Promise<Result<number, string>>;
  hset(key: RedisHashKey, field: string, value: string): Promise<Result<number, string>>;
  hget(key: RedisHashKey, field: string): Promise<Result<string | null, string>>;
  hgetall(key: RedisHashKey): Promise<Result<Record<string, string>, string>>;
  hdel(key: RedisHashKey, field: string): Promise<Result<number, string>>;
  sadd(key: RedisSetKey, member: string): Promise<Result<number, string>>;
  srem(key: RedisSetKey, member: string): Promise<Result<number, string>>;
  sismember(key: RedisSetKey, member: string): Promise<Result<boolean, string>>;
  smembers(key: RedisSetKey): Promise<Result<string[], string>>;
  lpush(key: RedisListKey, value: string): Promise<Result<number, string>>;
  rpush(key: RedisListKey, value: string): Promise<Result<number, string>>;
  lpop(key: RedisListKey): Promise<Result<string | null, string>>;
  rpop(key: RedisListKey): Promise<Result<string | null, string>>;
  lrange(key: RedisListKey, start: number, stop: number): Promise<Result<string[], string>>;
  llen(key: RedisListKey): Promise<Result<number, string>>;
}
