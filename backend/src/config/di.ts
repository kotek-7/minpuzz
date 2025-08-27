import type { Server } from 'socket.io';
import type { RedisClient } from '../repository/redisClient.js';
import { RedisGameStore } from '../repository/gameStore.redis.js';
import type { GameStore } from '../repository/gameStore.js';
import { SocketPublisher } from '../socket/publisher.js';

export function createGameStore(redis: RedisClient): GameStore {
  return new RedisGameStore(redis);
}

export function createPublisher(io: Server) {
  return new SocketPublisher(io);
}
