import { createClient } from "redis";
import { Result, ok, err } from "neverthrow";
import { RedisClient } from "./redisClient.js";
import { RedisHashKey, RedisKey, RedisListKey, RedisSetKey, RedisStringKey } from "./redisKeyTypes.js";
import { env } from "../env.js";

// Redis接続状態を管理する型
type RedisConnection = {
  client: ReturnType<typeof createClient>;
  isConnected: boolean;
};

// Redis接続を作成する関数
function createRedisConnection(url: string = env.REDIS_URL): RedisConnection {
  const client = createClient({ url });
  let isConnected = false;
  
  client.on("error", (err) => {
    console.error("Redis Client Error:", err);
  });

  client.on("connect", () => {
    console.log("Redis Client Connected");
    isConnected = true;
  });

  client.on("disconnect", () => {
    console.log("Redis Client Disconnected");
    isConnected = false;
  });

  return { client, isConnected };
}

// Redis操作関数群
async function connect(connection: RedisConnection): Promise<Result<void, string>> {
  try {
    if (!connection.isConnected) {
      await connection.client.connect();
    }
    return ok();
  } catch (error) {
    return err(`Failed to connect to Redis: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function disconnect(connection: RedisConnection): Promise<Result<void, string>> {
  try {
    if (connection.isConnected) {
      await connection.client.disconnect();
    }
    return ok();
  } catch (error) {
    return err(`Failed to disconnect from Redis: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function set(connection: RedisConnection, key: RedisStringKey, value: string, ttl?: number): Promise<Result<boolean, string>> {
  try {
    const result = ttl 
      ? await connection.client.setEx(key.key, ttl, value)
      : await connection.client.set(key.key, value);
    return ok(result === "OK");
  } catch (error) {
    return err(`Redis SET error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function get(connection: RedisConnection, key: RedisStringKey): Promise<Result<string | null, string>> {
  try {
    const result = await connection.client.get(key.key);
    return ok(result);
  } catch (error) {
    return err(`Redis GET error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function del(connection: RedisConnection, key: RedisKey): Promise<Result<number, string>> {
  try {
    const result = await connection.client.del(key.key);
    return ok(result);
  } catch (error) {
    return err(`Redis DEL error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function hset(connection: RedisConnection, key: RedisHashKey, field: string, value: string): Promise<Result<number, string>> {
  try {
    const result = await connection.client.hSet(key.key, field, value);
    return ok(result);
  } catch (error) {
    return err(`Redis HSET error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function hget(connection: RedisConnection, key: RedisHashKey, field: string): Promise<Result<string | null, string>> {
  try {
    const result = await connection.client.hGet(key.key, field);
    return ok(result || null);
  } catch (error) {
    return err(`Redis HGET error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function hgetall(connection: RedisConnection, key: RedisHashKey): Promise<Result<Record<string, string>, string>> {
  try {
    const result = await connection.client.hGetAll(key.key);
    return ok(result);
  } catch (error) {
    return err(`Redis HGETALL error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function hdel(connection: RedisConnection, key: RedisHashKey, field: string): Promise<Result<number, string>> {
  try {
    const result = await connection.client.hDel(key.key, field);
    return ok(result);
  } catch (error) {
    return err(`Redis HDEL error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function sadd(connection: RedisConnection, key: RedisSetKey, member: string): Promise<Result<number, string>> {
  try {
    const result = await connection.client.sAdd(key.key, member);
    return ok(result);
  } catch (error) {
    return err(`Redis SADD error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function srem(connection: RedisConnection, key: RedisSetKey, member: string): Promise<Result<number, string>> {
  try {
    const result = await connection.client.sRem(key.key, member);
    return ok(result);
  } catch (error) {
    return err(`Redis SREM error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function sismember(connection: RedisConnection, key: RedisSetKey, member: string): Promise<Result<boolean, string>> {
  try {
    const result = await connection.client.sIsMember(key.key, member);
    return ok(Boolean(result));
  } catch (error) {
    return err(`Redis SISMEMBER error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function smembers(connection: RedisConnection, key: RedisSetKey): Promise<Result<string[], string>> {
  try {
    const result = await connection.client.sMembers(key.key);
    return ok(result);
  } catch (error) {
    return err(`Redis SMEMBERS error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function keys(connection: RedisConnection, pattern: string): Promise<Result<string[], string>> {
  try {
    const result = await connection.client.keys(pattern);
    return ok(result);
  } catch (error) {
    return err(`Redis KEYS error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function lpush(connection: RedisConnection, key: RedisListKey, value: string): Promise<Result<number, string>> {
  try {
    const result = await connection.client.lPush(key.key, value);
    return ok(result);
  } catch (error) {
    return err(`Redis LPUSH error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function rpush(connection: RedisConnection, key: RedisListKey, value: string): Promise<Result<number, string>> {
  try {
    const result = await connection.client.rPush(key.key, value);
    return ok(result);
  } catch (error) {
    return err(`Redis RPUSH error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function lpop(connection: RedisConnection, key: RedisListKey): Promise<Result<string | null, string>> {
  try {
    const result = await connection.client.lPop(key.key);
    return ok(result || null);
  } catch (error) {
    return err(`Redis LPOP error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function rpop(connection: RedisConnection, key: RedisListKey): Promise<Result<string | null, string>> {
  try {
    const result = await connection.client.rPop(key.key);
    return ok(result || null);
  } catch (error) {
    return err(`Redis RPOP error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function lrange(connection: RedisConnection, key: RedisListKey, start: number, stop: number): Promise<Result<string[], string>> {
  try {
    const result = await connection.client.lRange(key.key, start, stop);
    return ok(result);
  } catch (error) {
    return err(`Redis LRANGE error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function llen(connection: RedisConnection, key: RedisListKey): Promise<Result<number, string>> {
  try {
    const result = await connection.client.lLen(key.key);
    return ok(result);
  } catch (error) {
    return err(`Redis LLEN error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// RedisClientインターフェースに準拠したオブジェクトを作成する関数
function createRedisClientImpl(connection: RedisConnection): RedisClient {
  return {
    async set(key: RedisStringKey, value: string, ttl?: number) {
      return set(connection, key, value, ttl);
    },
    async get(key: RedisStringKey) {
      return get(connection, key);
    },
    async delete(key: RedisKey) {
      return del(connection, key);
    },
    async hset(key: RedisHashKey, field: string, value: string) {
      return hset(connection, key, field, value);
    },
    async hget(key: RedisHashKey, field: string) {
      return hget(connection, key, field);
    },
    async hgetall(key: RedisHashKey) {
      return hgetall(connection, key);
    },
    async hdel(key: RedisHashKey, field: string) {
      return hdel(connection, key, field);
    },
    async sadd(key: RedisSetKey, member: string) {
      return sadd(connection, key, member);
    },
    async srem(key: RedisSetKey, member: string) {
      return srem(connection, key, member);
    },
    async sismember(key: RedisSetKey, member: string) {
      return sismember(connection, key, member);
    },
    async smembers(key: RedisSetKey) {
      return smembers(connection, key);
    },
    async keys(pattern: string) {
      return keys(connection, pattern);
    },
    async lpush(key: RedisListKey, value: string) {
      return lpush(connection, key, value);
    },
    async rpush(key: RedisListKey, value: string) {
      return rpush(connection, key, value);
    },
    async lpop(key: RedisListKey) {
      return lpop(connection, key);
    },
    async rpop(key: RedisListKey) {
      return rpop(connection, key);
    },
    async lrange(key: RedisListKey, start: number, stop: number) {
      return lrange(connection, key, start, stop);
    },
    async llen(key: RedisListKey) {
      return llen(connection, key);
    }
  };
}

// シングルトンインスタンス
let redisClientInstance: RedisClient | null = null;
let redisConnection: RedisConnection | null = null;

export function getRedisClient(): RedisClient {
  if (!redisClientInstance) {
    redisConnection = createRedisConnection();
    redisClientInstance = createRedisClientImpl(redisConnection);
  }
  return redisClientInstance;
}

// 接続関数を別途エクスポート
export function connectRedis(): Promise<Result<void, string>> {
  if (!redisConnection) {
    redisConnection = createRedisConnection();
  }
  return connect(redisConnection);
}

export function disconnectRedis(): Promise<Result<void, string>> {
  if (!redisConnection) {
    return Promise.resolve(ok());
  }
  return disconnect(redisConnection);
}