"use client";

import React from "react";

interface PuzzleBoardProps {
  board: { rows: number; cols: number } | null;
  pieces: Record<string, { id: string; placed?: boolean; row?: number; col?: number }>;
  selectedPieceId: string | null;
  pieceToDisplayIndexMap: Record<string, number>;
  occupiedCells: Set<string>;
  onCellClick: (row: number, col: number) => void; // 空セルクリック時の配置処理
  onPlacedPieceClick: (pieceId: string) => void; // 配置済みピースクリック時の選択処理
}

export default function PuzzleBoard({
  board,
  pieces,
  selectedPieceId,
  pieceToDisplayIndexMap,
  occupiedCells,
  onCellClick,
  onPlacedPieceClick
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
    const selectedPiece = selectedPieceId ? pieces[selectedPieceId] : null;
    const isMovingSelectedPiece = selectedPiece?.placed && selectedPiece.row === row && selectedPiece.col === col;

    // セルクリック処理
    const handleCellClick = () => {
      if (cellContent && !isMovingSelectedPiece) {
        // 配置済みピースをクリック → 選択
        onPlacedPieceClick(cellContent.pieceId);
      } else if (canPlace) {
        // 空きセルクリック → 配置/移動
        onCellClick(row, col);
      }
    };

    // セルスタイルを取得
    const getCellStyle = (): string => {
      const baseStyle = "aspect-square border-2 rounded-lg flex items-center justify-center text-lg font-bold transition-all duration-200 cursor-pointer";
      
      if (isMovingSelectedPiece) {
        // 移動対象のピース（選択中の配置済みピース）
        return `${baseStyle} bg-yellow-100 border-yellow-400 ring-4 ring-yellow-300 hover:bg-yellow-200`;
      } else if (cellContent) {
        // 他の配置済みピース
        return `${baseStyle} bg-green-100 border-green-400 hover:bg-green-200`;
      } else if (canPlace) {
        // 配置可能セル
        return `${baseStyle} bg-blue-50 border-blue-200 ring-2 ring-blue-200 hover:bg-blue-100`;
      } else if (isOccupied) {
        // 配置不可セル
        return `${baseStyle} bg-red-50 border-red-300`;
      } else {
        // 通常の空きセル（選択ピースなし）
        return `${baseStyle} bg-white border-gray-300`;
      }
    };

    // ツールチップテキストを取得
    const getTooltipText = (): string => {
      if (isMovingSelectedPiece) {
        return `選択中のピース ${cellContent!.displayIndex} - クリックで選択解除`;
      } else if (cellContent) {
        return `ピース ${cellContent.displayIndex} - クリックで選択`;
      } else if (canPlace) {
        const action = selectedPiece?.placed ? '移動' : '配置';
        return `${action}可能 - クリックでピース ${pieceToDisplayIndexMap[selectedPieceId!]}を${action}`;
      } else if (isOccupied) {
        return '配置不可';
      } else {
        return '空きセル';
      }
    };

    return (
      <div
        key={cellKey}
        className={getCellStyle()}
        title={getTooltipText()}
        onClick={handleCellClick}
      >
        {cellContent && (
          <div className="text-center pointer-events-none">
            <div className="text-xs text-gray-600 mb-1">ピース</div>
            <div className={`text-xl ${isMovingSelectedPiece ? 'text-yellow-600' : 'text-green-600'}`}>
              {cellContent.displayIndex}
            </div>
            {isMovingSelectedPiece && (
              <div className="text-xs text-yellow-600 mt-1">選択中</div>
            )}
          </div>
        )}
        {!cellContent && canPlace && (
          <div className="text-3xl text-blue-400 opacity-60 pointer-events-none">+</div>
        )}
        {!cellContent && !canPlace && selectedPieceId && isOccupied && (
          <div className="text-2xl text-red-400 opacity-60 pointer-events-none">×</div>
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
            ピース {pieceToDisplayIndexMap[selectedPieceId] || '?'} 
            {pieces[selectedPieceId]?.placed ? ' (配置済み - 移動可能)' : ' (未配置 - 配置可能)'} が選択中
          </p>
        )}
        {!selectedPieceId && (
          <p className="text-sm text-gray-500 mt-1">
            ピースを選択してから盤面をクリックしてください
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
        <div className="space-y-1">
          <div>✓ 緑: 配置済み（クリックで選択） | ⚡ 黄: 選択中（クリックで解除）</div>
          <div>+ 青: 配置/移動可能 | × 赤: 配置不可</div>
        </div>
      </div>
    </div>
  );
}