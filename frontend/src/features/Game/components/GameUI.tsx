"use client";

import React, { useEffect, useState } from "react";
import PuzzleBoard from "./PuzzleBoard";
import PieceSelector from "./PieceSelector";
import GameTimer from "./GameTimer";

import type { GameUIProps } from "./types";

export default function GameUI({ gameState, uiState, computedData, actions }: GameUIProps) {
  const { board, pieces, matchStatus, started } = gameState;
  const { selectedPieceId } = uiState;
  const { pieceToDisplayIndexMap, occupiedCells, remainingTimeMs } = computedData;

  const [glowPieceId, setGlowPieceId] = useState<number | null>(null);

  // glowFade アニメーションを注入（初回のみ）
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes glowFade {
        0% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.5); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // ピースを置いたときだけ glowPieceId を一時的にセット
  const handleCellClick = (row: number, col: number) => {
    if (!selectedPieceId) return;

    actions.onCellClick(row, col);

    setGlowPieceId(selectedPieceId);
    setTimeout(() => setGlowPieceId(null), 500);
  };

  return (
    <main className="relative min-h-screen overflow-hidden p-4">
      {/* 背景SVG */}
      <svg
        className="absolute inset-0 w-full h-full -z-10"
        viewBox="0 0 540 960"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <rect x="0" y="0" width="540" height="960" fill="#F5B12A" />
        <defs>
          <linearGradient id="grad1_0" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="30%" stopColor="#f5b12a" stopOpacity="1" />
            <stop offset="70%" stopColor="#f5b12a" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="grad2_0" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="30%" stopColor="#f5b12a" stopOpacity="1" />
            <stop offset="70%" stopColor="#f5b12a" stopOpacity="1" />
          </linearGradient>
        </defs>
        <g transform="translate(540, 0)">
          <path
            d="M0 432C-73.6 418 -147.2 404 -213.5 369.8C-279.8 335.5 -338.9 281 -374.1 216C-409.3 151 -420.7 75.5 -432 0L0 0Z"
            fill="#4AE2F3"
          />
        </g>
        <g transform="translate(0, 960)">
          <path
            d="M0 -432C74.4 -419.4 148.8 -406.8 215 -372.4C281.2 -338 339.3 -281.7 374.1 -216C408.9 -150.3 420.5 -75.1 432 0L0 0Z"
            fill="#4AE2F3"
          />
        </g>
      </svg>

      {/* コンテンツ */}
      <div className="container mx-auto max-w-6xl space-y-6">
        {/* タイマー */}
        <GameTimer
          remainingTimeMs={remainingTimeMs}
          isStarted={started}
          matchStatus={matchStatus}
        />

        {/* 盤面とピース一覧 */}
        <div className="grid lg:grid-cols-2 gap-8">
          <PuzzleBoard
            board={board}
            pieces={pieces}
            selectedPieceId={selectedPieceId}
            pieceToDisplayIndexMap={pieceToDisplayIndexMap}
            occupiedCells={occupiedCells}
            glowPieceId={glowPieceId}
            onCellClick={handleCellClick}
            onPlacedPieceClick={actions.onPlacedPieceClick}
          />

          <PieceSelector
            pieces={pieces}
            selectedPieceId={selectedPieceId}
            pieceToDisplayIndexMap={pieceToDisplayIndexMap}
            season="spring"
            onPieceSelect={actions.onPieceSelect}
          />
        </div>
      </div>
    </main>
  );
}