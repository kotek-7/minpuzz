import { createGameStore } from '../../config/di.js';
import { MockRedisClient } from '../setup/MockRedisClient.js';

describe('di - createGameStore', () => {
  test('always creates redis-backed GameStore', () => {
    const store = createGameStore(new MockRedisClient() as any);
    expect(typeof (store as any).addConnection).toBe('function');
  });
});
