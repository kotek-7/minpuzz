import type { Server } from 'socket.io';
import type { RedisClient } from '../repository/redisClient.js';
import { InMemoryGameStore } from '../repository/gameStore.memory.js';
import { RedisGameStore } from '../repository/gameStore.redis.js';
import type { GameStore } from '../repository/gameStore.js';
import { SocketPublisher } from '../socket/publisher.js';

export function createGameStore(redis: RedisClient, impl: 'memory'|'redis' = (process.env.GAME_STORE_IMPL as any) || 'memory'):
  GameStore {
  if (impl === 'redis') return new RedisGameStore(redis);
  return new InMemoryGameStore();
}

export function createPublisher(io: Server) {
  return new SocketPublisher(io);
}

