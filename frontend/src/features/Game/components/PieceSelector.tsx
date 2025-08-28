"use client";

import React from "react";
import Image from "next/image";

interface PieceSelectorProps {
  pieces: Record<string, { id: string; placed?: boolean; row?: number; col?: number }>;
  selectedPieceId: string | null;
  pieceToDisplayIndexMap: Record<string, number>;
  season?: 'spring' | 'summer' | 'automn' | 'winter'; // パズル画像のテーマ
  onPieceSelect: (pieceId: string) => void; // ピース選択ハンドラー
}

export default function PieceSelector({
  pieces,
  selectedPieceId,
  pieceToDisplayIndexMap,
  season = 'spring',
  onPieceSelect
}: PieceSelectorProps) {
  // 全ピース表示（配置済み・未配置を分けて表示）
  const allPieces = Object.values(pieces);
  const unplacedPieces = allPieces.filter(piece => !piece.placed);
  const placedPieces = allPieces.filter(piece => piece.placed);
  
  // displayIndex順にソート（見た目の一貫性のため）
  const sortedUnplacedPieces = unplacedPieces.map(piece => ({
    ...piece,
    displayIndex: pieceToDisplayIndexMap[piece.id] || 999
  })).sort((a, b) => a.displayIndex - b.displayIndex);

  const sortedPlacedPieces = placedPieces.map(piece => ({
    ...piece,
    displayIndex: pieceToDisplayIndexMap[piece.id] || 999
  })).sort((a, b) => a.displayIndex - b.displayIndex);

  // ピース位置を文字列で表現する関数
  const formatPosition = (row?: number, col?: number): string => {
    if (row === undefined || col === undefined) return "未配置";
    return `(${row + 1},${col + 1})`;
  };

  // ピーススタイルを取得する関数
  const getPieceStyle = (piece: any, isSelected: boolean): string => {
    const baseStyle = "relative aspect-square rounded-lg overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-md";
    
    if (piece.placed) {
      return `${baseStyle} ${isSelected ? 'ring-4 ring-yellow-400 shadow-lg scale-105' : 'ring-1 ring-gray-300'} opacity-70`;
    } else {
      return `${baseStyle} ${isSelected ? 'ring-4 ring-blue-400 shadow-lg scale-105' : 'ring-1 ring-gray-300'}`;
    }
  };

  // レンダー用の共通ピース関数
  const renderPiece = (piece: any, section: 'unplaced' | 'placed') => {
    const isSelected = selectedPieceId === piece.id;
    const imagePath = `/pieces/${season}/${piece.displayIndex}.png`;

    return (
      <div
        key={piece.id}
        className={getPieceStyle(piece, isSelected)}
        title={`ピース ${piece.displayIndex} ${piece.placed ? `- 配置済み ${formatPosition(piece.row, piece.col)}` : '- 未配置'}`}
        onClick={() => onPieceSelect(piece.id)}
      >
        <Image
          src={imagePath}
          alt={`ピース ${piece.displayIndex}`}
          width={64}
          height={64}
          className="w-full h-full object-cover"
          onError={(e) => {
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
            <div className={`text-white text-xs font-bold px-1 py-0.5 rounded ${piece.placed ? 'bg-yellow-500' : 'bg-blue-500'}`}>
              選択中
            </div>
          </div>
        )}
        
        {/* 配置済みピースの位置表示 */}
        {piece.placed && (
          <div className="absolute top-0 left-0 bg-green-600 text-white text-xs px-1 py-0.5 rounded-br">
            {formatPosition(piece.row, piece.col)}
          </div>
        )}
        
        {/* ピース番号 */}
        <div className="absolute bottom-0 right-0 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded-tl">
          {piece.displayIndex}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-bold text-gray-800">
          ピース選択
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          ピースをクリックして選択し、盤面に配置・移動してください
        </p>
      </div>

      {/* 未配置ピース */}
      {sortedUnplacedPieces.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
            <span className="w-3 h-3 bg-blue-400 rounded-full mr-2"></span>
            未配置ピース ({sortedUnplacedPieces.length}個)
          </h4>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-32 overflow-y-auto bg-blue-50 p-3 rounded-lg">
            {sortedUnplacedPieces.map(piece => renderPiece(piece, 'unplaced'))}
          </div>
        </div>
      )}

      {/* 配置済みピース */}
      {sortedPlacedPieces.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
            <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
            配置済みピース ({sortedPlacedPieces.length}個) - クリックで移動可能
          </h4>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-32 overflow-y-auto bg-green-50 p-3 rounded-lg">
            {sortedPlacedPieces.map(piece => renderPiece(piece, 'placed'))}
          </div>
        </div>
      )}

      {sortedUnplacedPieces.length === 0 && sortedPlacedPieces.length === 0 && (
        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-2">🧩</div>
          <div className="text-lg font-semibold text-gray-700">ピースがありません</div>
        </div>
      )}

      {selectedPieceId && (
        <div className="mt-3 p-2 bg-blue-50 rounded-lg text-center">
          <div className="text-sm text-blue-700">
            <strong>
              ピース {pieceToDisplayIndexMap[selectedPieceId] || '?'}
            </strong> {pieces[selectedPieceId]?.placed ? '(配置済み)' : '(未配置)'} が選択されています
          </div>
        </div>
      )}
    </div>
  );
}