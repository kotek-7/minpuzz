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
      <div className="grid grid-cols-5 gap-1 w-40 h-40 mx-auto">
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
    <div className="w-full bg-gray-50 p-4 rounded-lg border">
      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-700 mb-3">
          🚀 相手の進捗
        </h3>
        
        {partner?.teamId ? (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              チーム: <span className="font-semibold">{partner.teamId}</span>
              {partner.memberCount && (
                <span className="ml-2 text-xs">({partner.memberCount}人)</span>
              )}
            </div>
            
            {/* シルエット表示 */}
            <div className="bg-white p-3 rounded-lg border">
              <div className="text-xs text-gray-500 mb-2">配置状況 (シルエット)</div>
              {renderSilhouetteGrid()}
            </div>
            
            {/* 数値表示 */}
            <div className="flex items-center justify-center space-x-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {opponentScore}
                </div>
                <div className="text-xs text-gray-500">配置済み</div>
              </div>
              
              <div className="text-gray-400">/</div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {totalPieces}
                </div>
                <div className="text-xs text-gray-500">全体</div>
              </div>
            </div>
            
            {/* プログレスバー */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="text-xs text-gray-600">
              進捗率: <span className="font-semibold text-red-600">{progress}%</span>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 text-sm py-8">
            相手チーム情報を取得中...
          </div>
        )}
      </div>
      
      {/* 注意書き */}
      <div className="mt-4 text-xs text-gray-400 text-center border-t pt-2">
        💡 カンニング防止のため、相手の具体的な配置は表示されません
      </div>
    </div>
  );
}