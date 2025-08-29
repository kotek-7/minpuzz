"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

interface PieceSelectorProps {
  pieces: Record<string, { id: string; placed?: boolean; row?: number; col?: number }>;
  selectedPieceId: string | null;
  pieceToDisplayIndexMap: Record<string, number>;
  season?: "spring" | "summer" | "automn" | "winter";
  onPieceSelect: (pieceId: string) => void;
}

export default function PieceSelector({
  pieces,
  selectedPieceId,
  pieceToDisplayIndexMap,
  season = "spring",
  onPieceSelect,
}: PieceSelectorProps) {
  const [shuffledIds, setShuffledIds] = useState<string[]>([]);

  useEffect(() => {
    if (shuffledIds.length === 0 && Object.keys(pieces).length > 0) {
      const allIds = Object.values(pieces)
        .filter((piece) => !piece.placed)
        .map((piece) => piece.id);

      const shuffled = [...allIds].sort(() => Math.random() - 0.5);
      setShuffledIds(shuffled);
    }
  }, [pieces, shuffledIds]);

  const unplacedPieces = shuffledIds
    .map((id) => pieces[id])
    .filter((piece) => piece && !piece.placed)
    .map((piece) => ({
      ...piece,
      displayIndex: pieceToDisplayIndexMap[piece.id] || 999,
    }));

  return (
    <div className="bg-white p-6 rounded-xl border border-[#2EAFB9] shadow-sm">
      <div
        className="grid grid-cols-5 gap-2 overflow-y-auto p-2"
        style={{ maxHeight: `calc(100vh - 550px)` }}
      >
        {unplacedPieces.map((piece) => {
          const isFocused = selectedPieceId === piece.id;
          const imagePath = `/pieces/${season}/${piece.displayIndex}.png`;

          return (
            <div
              key={piece.id}
              onClick={() => onPieceSelect(piece.id)}
              className={`aspect-square rounded-lg cursor-pointer transition-all shadow-sm flex items-center justify-center relative ${
                isFocused
                  ? "z-50 scale-[1.2] shadow-lg overflow-visible p-0"
                  : "overflow-hidden p-1 border-2 border-[#2EAFB9] hover:border-[#27A2AA] hover:bg-[#F0FDFA] hover:shadow-md"
              }`}
              style={{
                transition: "transform 0.3s ease, box-shadow 0.3s ease, padding 0.3s ease",
              }}
            >
              <Image
                src={imagePath}
                alt={`ピース ${piece.displayIndex}`}
                width={256}
                height={256}
                unoptimized
                className="w-full h-full object-cover pointer-events-none rounded"
                style={{
                  transform: `scale(3.5)`,
                  transformOrigin: "center",
                }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  if (target.parentElement) {
                    target.parentElement.innerHTML = `
                      <div class="w-full h-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                        ${piece.displayIndex}
                      </div>
                    `;
                  }
                }}
              />
            </div>
          );
        })}

        {unplacedPieces.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            すべてのピースが配置されました
          </div>
        )}
      </div>
    </div>
  );
}