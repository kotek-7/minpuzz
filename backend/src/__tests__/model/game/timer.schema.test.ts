import { TimerSyncPayloadSchema } from '../../../model/game/schemas.js';

describe('TimerSyncPayloadSchema', () => {
  test('accepts valid payload', () => {
    const ok = {
      nowIso: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      durationMs: 60000,
      remainingMs: 12345,
    };
    expect(() => TimerSyncPayloadSchema.parse(ok)).not.toThrow();
  });

  test('rejects negative remaining', () => {
    const bad = {
      nowIso: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      durationMs: 60000,
      remainingMs: -1,
    };
    expect(() => TimerSyncPayloadSchema.parse(bad)).toThrow();
  });
});

