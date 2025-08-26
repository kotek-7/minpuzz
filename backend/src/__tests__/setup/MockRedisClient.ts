import { Result, ok, err } from "neverthrow";
import { RedisClient } from "../../repository/redisClient.js";
import { RedisHashKey, RedisKey, RedisListKey, RedisSetKey, RedisStringKey } from "../../repository/redisKeyTypes.js";

type MockRedisStorage = {
  strings: Map<string, { value: string; ttl?: number; expiresAt?: number }>;
  hashes: Map<string, Map<string, string>>;
  sets: Map<string, Set<string>>;
  lists: Map<string, string[]>;
};

const createEmptyStorage = (): MockRedisStorage => ({
  strings: new Map(),
  hashes: new Map(),
  sets: new Map(),
  lists: new Map(),
});

export class MockRedisClient implements RedisClient {
  private storage: MockRedisStorage = createEmptyStorage();
  private shouldFail: boolean = false;
  private errorMessage: string = "Mock Redis error";

  reset(): void {
    this.storage = createEmptyStorage();
    this.shouldFail = false;
    this.errorMessage = "Mock Redis error";
  }

  simulateError(message?: string): void {
    this.shouldFail = true;
    if (message) this.errorMessage = message;
  }

  stopSimulatingError(): void {
    this.shouldFail = false;
  }

  private checkExpiration(key: string): boolean {
    const entry = this.storage.strings.get(key);
    if (entry && entry.expiresAt && entry.expiresAt < Date.now()) {
      this.storage.strings.delete(key);
      return true;
    }
    return false;
  }

  private simulateRedisOperation<T>(operation: () => T): Result<T, string> {
    if (this.shouldFail) {
      return err(this.errorMessage);
    }
    try {
      return ok(operation());
    } catch (error) {
      return err(`Mock Redis operation error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async set(key: RedisStringKey, value: string, ttl?: number): Promise<Result<boolean, string>> {
    return this.simulateRedisOperation(() => {
      const expiresAt = ttl ? Date.now() + (ttl * 1000) : undefined;
      this.storage.strings.set(key.key, { value, ttl, expiresAt });
      return true;
    });
  }

  async get(key: RedisStringKey): Promise<Result<string | null, string>> {
    return this.simulateRedisOperation(() => {
      this.checkExpiration(key.key);
      const entry = this.storage.strings.get(key.key);
      return entry?.value || null;
    });
  }

  async delete(key: RedisKey): Promise<Result<number, string>> {
    return this.simulateRedisOperation(() => {
      let deleteCount = 0;
      
      if (this.storage.strings.delete(key.key)) deleteCount++;
      if (this.storage.hashes.delete(key.key)) deleteCount++;
      if (this.storage.sets.delete(key.key)) deleteCount++;
      if (this.storage.lists.delete(key.key)) deleteCount++;
      
      return deleteCount;
    });
  }

  async hset(key: RedisHashKey, field: string, value: string): Promise<Result<number, string>> {
    return this.simulateRedisOperation(() => {
      if (!this.storage.hashes.has(key.key)) {
        this.storage.hashes.set(key.key, new Map());
      }
      const hash = this.storage.hashes.get(key.key)!;
      const isNewField = !hash.has(field);
      hash.set(field, value);
      return isNewField ? 1 : 0;
    });
  }

  async hget(key: RedisHashKey, field: string): Promise<Result<string | null, string>> {
    return this.simulateRedisOperation(() => {
      const hash = this.storage.hashes.get(key.key);
      return hash?.get(field) || null;
    });
  }

  async hgetall(key: RedisHashKey): Promise<Result<Record<string, string>, string>> {
    return this.simulateRedisOperation(() => {
      const hash = this.storage.hashes.get(key.key);
      if (!hash) return {};
      
      const result: Record<string, string> = {};
      for (const [field, value] of hash.entries()) {
        result[field] = value;
      }
      return result;
    });
  }

  async hdel(key: RedisHashKey, field: string): Promise<Result<number, string>> {
    return this.simulateRedisOperation(() => {
      const hash = this.storage.hashes.get(key.key);
      if (!hash) return 0;
      
      return hash.delete(field) ? 1 : 0;
    });
  }

  async sadd(key: RedisSetKey, member: string): Promise<Result<number, string>> {
    return this.simulateRedisOperation(() => {
      if (!this.storage.sets.has(key.key)) {
        this.storage.sets.set(key.key, new Set());
      }
      const set = this.storage.sets.get(key.key)!;
      const initialSize = set.size;
      set.add(member);
      return set.size - initialSize;
    });
  }

  async srem(key: RedisSetKey, member: string): Promise<Result<number, string>> {
    return this.simulateRedisOperation(() => {
      const set = this.storage.sets.get(key.key);
      if (!set) return 0;
      
      return set.delete(member) ? 1 : 0;
    });
  }

  async sismember(key: RedisSetKey, member: string): Promise<Result<boolean, string>> {
    return this.simulateRedisOperation(() => {
      const set = this.storage.sets.get(key.key);
      return set ? set.has(member) : false;
    });
  }

  async smembers(key: RedisSetKey): Promise<Result<string[], string>> {
    return this.simulateRedisOperation(() => {
      const set = this.storage.sets.get(key.key);
      return set ? Array.from(set) : [];
    });
  }

  async keys(pattern: string): Promise<Result<string[], string>> {
    return this.simulateRedisOperation(() => {
      const allKeys: string[] = [];
      
      // Collect all keys from different storage types
      for (const key of this.storage.strings.keys()) {
        allKeys.push(key);
      }
      for (const key of this.storage.hashes.keys()) {
        allKeys.push(key);
      }
      for (const key of this.storage.sets.keys()) {
        allKeys.push(key);
      }
      for (const key of this.storage.lists.keys()) {
        allKeys.push(key);
      }

      // Simple pattern matching (support for * wildcard)
      const regexPattern = pattern.replace(/\*/g, '.*');
      const regex = new RegExp(`^${regexPattern}$`);
      
      return allKeys.filter(key => regex.test(key));
    });
  }

  async lpush(key: RedisListKey, value: string): Promise<Result<number, string>> {
    return this.simulateRedisOperation(() => {
      if (!this.storage.lists.has(key.key)) {
        this.storage.lists.set(key.key, []);
      }
      const list = this.storage.lists.get(key.key)!;
      list.unshift(value);
      return list.length;
    });
  }

  async rpush(key: RedisListKey, value: string): Promise<Result<number, string>> {
    return this.simulateRedisOperation(() => {
      if (!this.storage.lists.has(key.key)) {
        this.storage.lists.set(key.key, []);
      }
      const list = this.storage.lists.get(key.key)!;
      list.push(value);
      return list.length;
    });
  }

  async lpop(key: RedisListKey): Promise<Result<string | null, string>> {
    return this.simulateRedisOperation(() => {
      const list = this.storage.lists.get(key.key);
      if (!list || list.length === 0) return null;
      
      return list.shift() || null;
    });
  }

  async rpop(key: RedisListKey): Promise<Result<string | null, string>> {
    return this.simulateRedisOperation(() => {
      const list = this.storage.lists.get(key.key);
      if (!list || list.length === 0) return null;
      
      return list.pop() || null;
    });
  }

  async lrange(key: RedisListKey, start: number, stop: number): Promise<Result<string[], string>> {
    return this.simulateRedisOperation(() => {
      const list = this.storage.lists.get(key.key);
      if (!list) return [];
      
      return list.slice(start, stop + 1);
    });
  }

  async llen(key: RedisListKey): Promise<Result<number, string>> {
    return this.simulateRedisOperation(() => {
      const list = this.storage.lists.get(key.key);
      return list ? list.length : 0;
    });
  }

  // Utility methods for testing
  getStorageSnapshot(): MockRedisStorage {
    return {
      strings: new Map(this.storage.strings),
      hashes: new Map(Array.from(this.storage.hashes.entries()).map(([k, v]) => [k, new Map(v)])),
      sets: new Map(Array.from(this.storage.sets.entries()).map(([k, v]) => [k, new Set(v)])),
      lists: new Map(Array.from(this.storage.lists.entries()).map(([k, v]) => [k, [...v]])),
    };
  }

  hasKey(key: string): boolean {
    return this.storage.strings.has(key) || 
           this.storage.hashes.has(key) || 
           this.storage.sets.has(key) || 
           this.storage.lists.has(key);
  }
}