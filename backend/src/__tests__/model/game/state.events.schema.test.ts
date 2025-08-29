import { RequestGameInitPayloadSchema, StateSyncPayloadSchema, PieceSchema, ScoreSchema, TimerSchema } from '../../../model/game/schemas.js';

describe('M6 state sync event schemas', () => {
  test('request-game-init payload schema', () => {
    expect(() => RequestGameInitPayloadSchema.parse({ matchId: 'm', teamId: 't', userId: 'u' })).not.toThrow();
    expect(() => RequestGameInitPayloadSchema.parse({ matchId: '', teamId: 't', userId: 'u' })).toThrow();
  });

  test('state-sync payload schema accepts valid shape', () => {
    const piece = PieceSchema.parse({ id: 'p', placed: false });
    const score = ScoreSchema.parse({ placedByTeam: { T: 1 } });
    const timer = TimerSchema.parse({ startedAt: new Date().toISOString(), durationMs: 60000 });
    expect(() => StateSyncPayloadSchema.parse({
      board: { rows: 5, cols: 5 },
      pieces: [piece],
      score,
      timer,
      matchStatus: 'IN_GAME',
    })).not.toThrow();
  });

  test('state-sync payload schema rejects invalid board', () => {
    const score = { placedByTeam: {} };
    expect(() => StateSyncPayloadSchema.parse({ board: { rows: 0, cols: 5 }, pieces: [], score, timer: null, matchStatus: 'READY' })).toThrow();
  });
});
