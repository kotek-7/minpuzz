
import { buildInitPayload, buildInitPayloadWithTimer, buildInitPayloadWithPieces, GameInitPayloadSchema } from '../../../model/game/init.js';

describe('init (click, 5x5)', () => {
  test('buildInitPayload returns 5x5 board with empty pieces (legacy)', () => {
    const p = buildInitPayload({ matchId: 'm1', teamId: 't1', userId: 'u1' });
    expect(p.board.rows).toBe(5);
    expect(p.board.cols).toBe(5);
    expect(Array.isArray(p.pieces) && p.pieces.length === 0).toBe(true);
    // schema check
    expect(() => GameInitPayloadSchema.parse(p)).not.toThrow();
  });

  test('buildInitPayloadWithTimer propagates timer when provided (legacy)', () => {
    const timer = { startedAt: new Date().toISOString(), durationMs: 120000 };
    const p = buildInitPayloadWithTimer({ matchId: 'm1', teamId: 't1', userId: 'u1' }, timer);
    expect(p.board.rows).toBe(5);
    expect(p.startedAt).toBe(timer.startedAt);
    expect(p.durationMs).toBe(timer.durationMs);
    expect(Array.isArray(p.pieces) && p.pieces.length === 0).toBe(true);
  });

  test('buildInitPayloadWithPieces includes actual pieces from store', async () => {
    // 簡単なモックを直接作成
    const mockStore = {
      listPieces: jest.fn(),
    };
    
    // モックピースデータを準備
    const mockPieces = [
      { id: 'p-0-0', placed: false, solRow: 0, solCol: 0 },
      { id: 'p-0-1', placed: false, solRow: 0, solCol: 1 },
      { id: 'p-1-0', placed: true, row: 1, col: 0, solRow: 1, solCol: 0 },
    ];
    mockStore.listPieces.mockResolvedValue({ isOk: () => true, value: mockPieces });

    const timer = { startedAt: new Date().toISOString(), durationMs: 120000 };
    const p = await buildInitPayloadWithPieces(mockStore as any, { matchId: 'm1', teamId: 't1', userId: 'u1' }, timer);

    expect(p.board.rows).toBe(5);
    expect(p.board.cols).toBe(5);
    expect(p.startedAt).toBe(timer.startedAt);
    expect(p.durationMs).toBe(timer.durationMs);
    
    // ピースが含まれることを確認
    expect(p.pieces).toHaveLength(3);
    expect(p.pieces[0]).toEqual({ id: 'p-0-0', placed: false, row: undefined, col: undefined });
    expect(p.pieces[1]).toEqual({ id: 'p-0-1', placed: false, row: undefined, col: undefined });
    expect(p.pieces[2]).toEqual({ id: 'p-1-0', placed: true, row: 1, col: 0 });
    
    // schema check
    expect(() => GameInitPayloadSchema.parse(p)).not.toThrow();
  });

  test('buildInitPayloadWithPieces handles store error gracefully', async () => {
    const mockStore = {
      listPieces: jest.fn(),
    };
    mockStore.listPieces.mockResolvedValue({ isOk: () => false, error: 'io' });

    const p = await buildInitPayloadWithPieces(mockStore as any, { matchId: 'm1', teamId: 't1', userId: 'u1' });

    expect(p.board.rows).toBe(5);
    expect(p.board.cols).toBe(5);
    expect(p.pieces).toHaveLength(0); // エラー時は空配列
    expect(p.startedAt).toBeNull();
    expect(p.durationMs).toBeNull();
  });
});

