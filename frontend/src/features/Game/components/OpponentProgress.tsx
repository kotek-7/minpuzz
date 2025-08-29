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
  totalPieces = 25 
}: OpponentProgressProps) {
  const progress = Math.round((opponentScore / totalPieces) * 100);

  // 5x5グリッドの配置状況をシルエットで表示
  const renderSilhouetteGrid = () => {
    const placedCells = opponentScore;
    const emptyCells = totalPieces - placedCells;
    
    return (
      <div className="grid grid-cols-5 gap-0.5 w-16 h-16 mx-auto">
        {Array.from({ length: totalPieces }, (_, index) => {
          const isPlaced = index < placedCells;
          return (
            <div
              key={index}
              className={`
                aspect-square rounded-sm transition-all duration-300
                ${isPlaced 
                  ? 'bg-red-400 shadow-sm' 
                  : 'bg-gray-200 border border-gray-300'
                }
              `}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-fit bg-gray-50 px-2 py-2 rounded-lg border ml-auto">
      <div className="text-center">
        {partner?.teamId ? (
          <div className="space-y-3">
            {/* シルエット表示 */}
              <div className="text-xs text-gray-500 mb-2">相手の配置状況</div>
              {renderSilhouetteGrid()}
          </div>
        ) : (
          <div className="text-gray-400 text-sm py-8">
            相手チーム情報を取得中...
          </div>
        )}
      </div>
      
    </div>
  );
}