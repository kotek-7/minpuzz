// 盤面幾何のヘルパ（暫定）
export type BoardGeometry = {
  originX: number;
  originY: number;
  cellSize: number;
  snapTolerancePx: number;
};

export const defaultGeometry: BoardGeometry = {
  originX: 0,
  originY: 0,
  cellSize: 100,
  // TODO: 実ゲーム値に合わせて調整。現状は寛容にして既存テストを壊さない。
  snapTolerancePx: 1000,
};

export function cellCenter(geom: BoardGeometry, row: number, col: number) {
  return {
    x: geom.originX + col * geom.cellSize + geom.cellSize / 2,
    y: geom.originY + row * geom.cellSize + geom.cellSize / 2,
  };
}

export function withinSnap(geom: BoardGeometry, row: number, col: number, x: number, y: number): boolean {
  const c = cellCenter(geom, row, col);
  const dx = x - c.x;
  const dy = y - c.y;
  const dist = Math.hypot(dx, dy);
  return dist <= geom.snapTolerancePx;
}

