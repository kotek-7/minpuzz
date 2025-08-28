"use client";

import React from "react";

interface PuzzleBoardProps {
  board: { rows: number; cols: number } | null;
  pieces: Record<string, { id: string; placed?: boolean; row?: number; col?: number }>;
  selectedPieceId: string | null;
  pieceToDisplayIndexMap: Record<string, number>;
  occupiedCells: Set<string>;
}

export default function PuzzleBoard({
  board,
  pieces,
  selectedPieceId,
  pieceToDisplayIndexMap,
  occupiedCells
}: PuzzleBoardProps) {
  if (!board) {
    return (
      <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">盤面を読み込み中...</div>
      </div>
    );
  }

  const { rows, cols } = board;

  // 配置済みピースから盤面の状態を構築
  const boardState: Array<Array<{ pieceId: string; displayIndex: number } | null>> = 
    Array(rows).fill(null).map(() => Array(cols).fill(null));

  // 配置済みピースを盤面にマッピング
  Object.values(pieces).forEach(piece => {
    if (piece.placed && piece.row !== undefined && piece.col !== undefined) {
      const displayIndex = pieceToDisplayIndexMap[piece.id] || 1;
      
      if (piece.row < rows && piece.col < cols) {
        boardState[piece.row][piece.col] = {
          pieceId: piece.id,
          displayIndex
        };
      }
    }
  });

  const renderCell = (row: number, col: number) => {
    const cellContent = boardState[row][col];
    const cellKey = `${row}-${col}`;
    const isOccupied = occupiedCells.has(cellKey);
    const canPlace = selectedPieceId && !isOccupied;

    return (
      <div
        key={cellKey}
        className={`
          aspect-square border-2 border-gray-300 rounded-lg flex items-center justify-center
          text-lg font-bold transition-all duration-200
          ${cellContent 
            ? 'bg-green-100 border-green-400' 
            : isOccupied 
              ? 'bg-red-50 border-red-300' 
              : canPlace
                ? 'bg-blue-50 border-blue-200'
                : 'bg-white'
          }
          ${selectedPieceId && canPlace ? 'ring-2 ring-blue-200' : ''}
        `}
        title={
          cellContent 
            ? `ピース ${cellContent.displayIndex}` 
            : canPlace 
              ? '配置可能' 
              : isOccupied 
                ? '配置済み' 
                : ''
        }
      >
        {cellContent && (
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-1">ピース</div>
            <div className="text-xl text-green-600">{cellContent.displayIndex}</div>
          </div>
        )}
        {!cellContent && canPlace && (
          <div className="text-3xl text-blue-400 opacity-60">+</div>
        )}
        {!cellContent && !canPlace && selectedPieceId && isOccupied && (
          <div className="text-2xl text-red-400 opacity-60">×</div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="mb-4 text-center">
        <h2 className="text-xl font-bold text-gray-800">パズル盤面 ({rows}×{cols})</h2>
        {selectedPieceId && (
          <p className="text-sm text-blue-600 mt-1">
            ピース {pieceToDisplayIndexMap[selectedPieceId] || '?'} が選択中
          </p>
        )}
      </div>
      
      <div 
        className="grid gap-1 bg-gray-100 p-2 rounded-xl shadow-lg"
        style={{ 
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)` 
        }}
      >
        {Array.from({ length: rows }, (_, row) =>
          Array.from({ length: cols }, (_, col) => renderCell(row, col))
        )}
      </div>
      
      <div className="mt-3 text-xs text-gray-500 text-center">
        <div>✓ 緑: 配置済み | + 青: 配置可能 | × 赤: 配置不可</div>
      </div>
    </div>
  );
}