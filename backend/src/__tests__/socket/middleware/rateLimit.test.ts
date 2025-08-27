import { createThrottler } from '../../../socket/middleware/rateLimit.js';

describe('rateLimit middleware', () => {
  test('min interval gating by key', () => {
    let now = 0;
    const throttler = createThrottler(50, () => now);
    const key = 'socket:1';

    // first call allowed
    expect(throttler.shouldAllow(key)).toBe(true);
    // same timestamp -> blocked
    expect(throttler.shouldAllow(key)).toBe(false);
    // +49ms still blocked
    now += 49;
    expect(throttler.shouldAllow(key)).toBe(false);
    // +1ms reaches threshold
    now += 1;
    expect(throttler.shouldAllow(key)).toBe(true);
    // other key independent
    const key2 = 'socket:2';
    expect(throttler.shouldAllow(key2)).toBe(true);
  });
});

