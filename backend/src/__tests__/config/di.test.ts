import { createGameStore } from '../../config/di.js';
import { MockRedisClient } from '../setup/MockRedisClient.js';

describe('di - createGameStore', () => {
  test('defaults to memory', () => {
    const store = createGameStore(new MockRedisClient() as any, 'memory');
    expect(typeof (store as any).addConnection).toBe('function');
  });

  test('can create redis store', () => {
    const store = createGameStore(new MockRedisClient() as any, 'redis');
    expect(typeof (store as any).addConnection).toBe('function');
  });
});

