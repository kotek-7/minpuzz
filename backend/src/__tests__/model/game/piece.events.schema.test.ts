import { 
  PieceGrabPayloadSchema,
  PieceGrabbedPayloadSchema,
  PieceGrabDeniedPayloadSchema,
  PieceMovePayloadSchema,
  PieceMovedPayloadSchema,
  PieceReleasePayloadSchema,
  PieceReleasedPayloadSchema,
} from '../../../model/game/schemas.js';

describe('M3 event payload schemas', () => {
  test('piece-grab payload valid/invalid', () => {
    expect(() => PieceGrabPayloadSchema.parse({ matchId: 'm', teamId: 't', userId: 'u', pieceId: 'p' })).not.toThrow();
    expect(() => PieceGrabPayloadSchema.parse({ matchId: '', teamId: 't', userId: 'u', pieceId: 'p' })).toThrow();
  });

  test('piece-grabbed / denied payloads', () => {
    expect(() => PieceGrabbedPayloadSchema.parse({ pieceId: 'p', byUserId: 'u' })).not.toThrow();
    expect(() => PieceGrabDeniedPayloadSchema.parse({ pieceId: 'p', reason: 'locked' })).not.toThrow();
    expect(() => PieceGrabDeniedPayloadSchema.parse({ pieceId: 'p', reason: 'x' })).toThrow();
  });

  test('piece-move / moved payloads', () => {
    const ok = { matchId: 'm', teamId: 't', userId: 'u', pieceId: 'p', x: 1, y: 2, ts: 3 };
    expect(() => PieceMovePayloadSchema.parse(ok)).not.toThrow();
    expect(() => PieceMovePayloadSchema.parse({ ...ok, ts: -1 })).toThrow();
    expect(() => PieceMovedPayloadSchema.parse({ pieceId: 'p', x: 1, y: 2, byUserId: 'u', ts: 0 })).not.toThrow();
  });

  test('piece-release / released payloads', () => {
    expect(() => PieceReleasePayloadSchema.parse({ matchId: 'm', teamId: 't', userId: 'u', pieceId: 'p', x: 0, y: 0 })).not.toThrow();
    expect(() => PieceReleasedPayloadSchema.parse({ pieceId: 'p', x: 0, y: 0, byUserId: 'u' })).not.toThrow();
  });
});

