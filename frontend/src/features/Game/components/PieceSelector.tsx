"use client";

import React from "react";
import Image from "next/image";

interface PieceSelectorProps {
  pieces: Record<string, { id: string; placed?: boolean; row?: number; col?: number }>;
  selectedPieceId: string | null;
  pieceToDisplayIndexMap: Record<string, number>;
  season?: 'spring' | 'summer' | 'automn' | 'winter'; // パズル画像のテーマ
}

export default function PieceSelector({
  pieces,
  selectedPieceId,
  pieceToDisplayIndexMap,
  season = 'spring'
}: PieceSelectorProps) {
  // 未配置のピースのみ表示対象
  const availablePieces = Object.values(pieces).filter(piece => !piece.placed);
  
  // displayIndex順にソート（見た目の一貫性のため）
  const sortedPieces = availablePieces.map(piece => ({
    ...piece,
    displayIndex: pieceToDisplayIndexMap[piece.id] || 999
  })).sort((a, b) => a.displayIndex - b.displayIndex);

  if (sortedPieces.length === 0) {
    return (
      <div className="text-center p-6 bg-gray-50 rounded-lg">
        <div className="text-2xl mb-2">🎉</div>
        <div className="text-lg font-semibold text-gray-700">全てのピースが配置されました！</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-bold text-gray-800">
          ピース選択 ({availablePieces.length}個残り)
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          ピースをクリックして選択し、盤面に配置してください
        </p>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-48 overflow-y-auto bg-gray-50 p-3 rounded-lg">
        {sortedPieces.map((piece) => {
          const isSelected = selectedPieceId === piece.id;
          const imagePath = `/pieces/${season}/${piece.displayIndex}.png`;

          return (
            <div
              key={piece.id}
              className={`
                relative aspect-square rounded-lg overflow-hidden transition-all duration-200
                ${isSelected 
                  ? 'ring-4 ring-blue-400 shadow-lg scale-105' 
                  : 'ring-1 ring-gray-300'
                }
                bg-white
              `}
              title={`ピース ${piece.displayIndex}`}
            >
              <Image
                src={imagePath}
                alt={`ピース ${piece.displayIndex}`}
                width={64}
                height={64}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // 画像読み込みエラー時のフォールバック
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  if (target.parentElement) {
                    target.parentElement.innerHTML = `
                      <div class="w-full h-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                        ${piece.displayIndex}
                      </div>
                    `;
                  }
                }}
              />
              
              {/* 選択状態のオーバーレイ */}
              {isSelected && (
                <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                  <div className="bg-blue-500 text-white text-xs font-bold px-1 py-0.5 rounded">
                    選択中
                  </div>
                </div>
              )}
              
              {/* ピース番号 */}
              <div className="absolute bottom-0 right-0 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded-tl">
                {piece.displayIndex}
              </div>
            </div>
          );
        })}
      </div>

      {selectedPieceId && (
        <div className="mt-3 p-2 bg-blue-50 rounded-lg text-center">
          <div className="text-sm text-blue-700">
            <strong>
              ピース {pieceToDisplayIndexMap[selectedPieceId] || '?'}
            </strong> が選択されています
          </div>
        </div>
      )}
    </div>
  );
}