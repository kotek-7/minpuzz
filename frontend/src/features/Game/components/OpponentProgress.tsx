"use client";

import React from "react";

interface OpponentProgressProps {
  opponentScore: number;
  partner?: { teamId: string; memberCount?: number } | null;
  totalPieces?: number;
}

export default function OpponentProgress({
  opponentScore,
  partner,
  totalPieces = 25,
}: OpponentProgressProps) {
  const progress = Math.round((opponentScore / totalPieces) * 100);

  const renderSilhouetteGrid = () => {
    const placedCells = opponentScore;
    return (
      <div className="grid grid-cols-5 gap-0.5 w-20 h-20 mx-auto">
        {Array.from({ length: totalPieces }, (_, index) => {
          const isPlaced = index < placedCells;
          return (
            <div
              key={index}
              className={`aspect-square rounded-sm transition-all duration-300 ${
                isPlaced
                  ? "bg-red-400 shadow-sm"
                  : "bg-gray-200 border border-gray-300"
              }`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full bg-white border border-gray-300 rounded-xl p-4 shadow-sm">
      <div className="text-center space-y-3">
        {partner?.teamId ? (
          <>
            <div className="text-sm font-semibold text-gray-600">
              相手チームの進捗
            </div>
            {renderSilhouetteGrid()}
            <div className="text-xs text-red-500 font-medium">
              {opponentScore}/{totalPieces} ピース配置済み（{progress}%）
            </div>
          </>
        ) : (
          <div className="text-gray-400 text-sm py-8">
            相手チーム情報を取得中...
          </div>
        )}
      </div>
    </div>
  );
}