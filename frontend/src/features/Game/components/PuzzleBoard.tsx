"use client";

import React from "react";

interface PuzzleBoardProps {
  board: { rows: number; cols: number } | null;
  pieces: Record<string, { id: string; placed?: boolean; row?: number; col?: number }>;
  selectedPieceId: string | null;
  pieceToDisplayIndexMap: Record<string, number>;
  occupiedCells: Set<string>;
  glowPieceId: string | null;
  onCellClick: (row: number, col: number) => void;
  onPlacedPieceClick: (pieceId: string) => void;
}

export default function PuzzleBoard({
  board,
  pieces,
  selectedPieceId,
  pieceToDisplayIndexMap,
  occupiedCells,
  glowPieceId,
  onCellClick,
  onPlacedPieceClick,
}: PuzzleBoardProps) {
  if (!board) {
    return (
      <div className="w-full aspect-square bg-gray-200 rounded-xl flex items-center justify-center shadow-inner">
        <div className="text-gray-500">盤面を読み込み中...</div>
      </div>
    );
  }

  const { rows, cols } = board;

  const boardState: Array<Array<{ pieceId: string; displayIndex: number } | null>> =
    Array(rows).fill(null).map(() => Array(cols).fill(null));

  Object.values(pieces).forEach((piece) => {
    if (piece.placed && piece.row !== undefined && piece.col !== undefined) {
      const displayIndex = pieceToDisplayIndexMap[piece.id] || 1;
      if (piece.row < rows && piece.col < cols) {
        boardState[piece.row][piece.col] = {
          pieceId: piece.id,
          displayIndex,
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
    const season = "spring";

    const handleCellClick = () => {
      if (cellContent && !isMovingSelectedPiece) {
        onPlacedPieceClick(cellContent.pieceId);
      } else if (canPlace) {
        onCellClick(row, col);
      } else if (isMovingSelectedPiece) {
        onPlacedPieceClick(cellContent!.pieceId);
      }
    };

    const isSelected = selectedPieceId && cellContent?.pieceId === selectedPieceId;
    const isGlowing = glowPieceId === cellContent?.pieceId && !isSelected;

    return (
      <div
        key={cellKey}
        className="relative aspect-square bg-white rounded-lg cursor-pointer shadow-inner border border-[#2EAFB9]"
        onClick={handleCellClick}
      >
        {cellContent && (
          <div
            className={`absolute inset-0 w-full h-full bg-cover bg-center rounded-md pointer-events-none ${
              isSelected ? "scale-[1.2] shadow-lg z-10" : ""
            }`}
            style={{
              backgroundImage: `url(/pieces/${season}/${cellContent.displayIndex}.png)`,
              transform: "scale(3.6)",
              transformOrigin: "center",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
            }}
          />
        )}

        {isGlowing && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              borderRadius: "12px",
              boxShadow: "0 0 20px 8px rgba(74,226,243,0.6)",
              opacity: 1,
              transform: "scale(1)",
              animation: "glowFade 0.5s ease-out forwards",
              pointerEvents: "none",
              zIndex: 20,
            }}
          />
        )}

        {!cellContent && canPlace && (
          <div className="absolute inset-0 flex items-center justify-center text-4xl text-blue-500 opacity-70 pointer-events-none">
            +
          </div>
        )}

        {!cellContent && !canPlace && selectedPieceId && isOccupied && (
          <div className="absolute inset-0 flex items-center justify-center text-3xl text-red-500 opacity-70 pointer-events-none">
            ×
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-[#2EAFB9] shadow-sm">
      <div
        className="grid gap-0 bg-gray-100 p-4 rounded-lg border border-[#2EAFB9]"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {Array.from({ length: rows }, (_, row) =>
          Array.from({ length: cols }, (_, col) => renderCell(row, col))
        )}
      </div>
    </div>
  );
}