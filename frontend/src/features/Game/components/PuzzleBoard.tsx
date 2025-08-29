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
    const season = "spring"; // TODO: propsから受け取る

    // セルクリック処理
    const handleCellClick = () => {
      if (cellContent && !isMovingSelectedPiece) {
        onPlacedPieceClick(cellContent.pieceId);
      } else if (canPlace) {
        onCellClick(row, col);
      } else if (isMovingSelectedPiece) {
        onPlacedPieceClick(cellContent!.pieceId);
      }
    };

    // オーバーレイのスタイルを決定
    const getOverlayStyle = (): string => {
      const baseStyle = "absolute inset-0 w-full h-full rounded-lg z-20 transition-all duration-200 pointer-events-none border-4";
      if (isMovingSelectedPiece) return `${baseStyle} border-yellow-400 bg-yellow-400/30`;
      if (cellContent) return "absolute inset-0 w-full h-full rounded-lg z-20 transition-all duration-200 pointer-events-none border-4 border-transparent group-hover:border-green-400/70";
      if (canPlace) return `${baseStyle} border-blue-400 bg-blue-400/30`;
      if (isOccupied) return `${baseStyle} border-red-400 bg-red-400/30`;
      return "absolute inset-0 w-full h-full rounded-lg z-20 transition-all duration-200 pointer-events-none border-2 border-gray-300 group-hover:border-gray-400";
    };

    // ツールチップテキストを取得
    const getTooltipText = (): string => {
      if (isMovingSelectedPiece) return `選択中のピース ${cellContent!.displayIndex} - クリックで選択解除`;
      if (cellContent) return `ピース ${cellContent.displayIndex} - クリックで選択`;
      if (canPlace) {
        const action = selectedPiece?.placed ? '移動' : '配置';
        return `${action}可能 - クリックでピース ${pieceToDisplayIndexMap[selectedPieceId!]}を${action}`;
      }
      if (isOccupied) return '配置不可';
      return '空きセル';
    };

    return (
      <div
        key={cellKey}
        className="group relative aspect-square bg-white rounded-lg cursor-pointer shadow-inner"
        title={getTooltipText()}
        onClick={handleCellClick}
      >
        {/* 1. ピース画像  */}
        {cellContent && (
          <div
            className="absolute scale-[3.6] z-10 pointer-events-none inset-0 w-full h-full bg-cover bg-center rounded-md"
            style={{ backgroundImage: `url(/pieces/${season}/${cellContent.displayIndex}.png)` }}
          />
        )}

        {/* 2. 状態オーバーレイ  */}
        <div className={getOverlayStyle()}>
          {!cellContent && canPlace && (
            <div className="w-full h-full flex items-center justify-center text-4xl text-blue-500 opacity-70">+</div>
          )}
          {!cellContent && !canPlace && selectedPieceId && isOccupied && (
            <div className="w-full h-full flex items-center justify-center text-3xl text-red-500 opacity-70">×</div>
          )}
        </div>
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
        className="grid gap-0.5 bg-gray-100 p-2 rounded-xl shadow-lg"
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