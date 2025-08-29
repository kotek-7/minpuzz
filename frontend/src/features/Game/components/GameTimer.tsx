"use client";

import React from "react";
import { Clock, Trophy } from "lucide-react";
import GameStatus from "./GameStatus";

interface GameTimerProps {
  remainingTimeMs: number | null;
  isStarted: boolean;
  matchStatus: "PREPARING" | "READY" | "IN_GAME" | "COMPLETED" | "UNKNOWN";
  isComplete: boolean;
  myScore: number;
  opponentScore: number;
  totalPieces: number;
}

export default function GameTimer({
  remainingTimeMs,
  isStarted,
  matchStatus,
  isComplete,
  myScore,
  opponentScore,
  totalPieces,
}: GameTimerProps) {
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const isTimeUp = matchStatus === "COMPLETED";

  return (
    <div className="py-3 px-6 w-fit bg-white rounded-xl border border-[#2EAFB9] shadow-sm">
      <div className="flex flex-col gap-2">
        {/* タイマー表示 */}
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-teal-600" />
          <span className="text-2xl font-bold text-teal-600">
            {remainingTimeMs !== null ? formatTime(remainingTimeMs) : "--:--"}
          </span>
        </div>

        {/* 完成時の表示 */}
        {isComplete && isTimeUp && (
          <div className="flex items-center gap-2 text-green-600 font-semibold">
            <Trophy className="w-5 h-5" />
            <span>完成おめでとう！</span>
          </div>
        )}

        {/* 時間切れ時の表示（未完成） */}
        {!isComplete && isTimeUp && (
          <>
            <div className="text-red-600 font-semibold">時間切れ！</div>
            <GameStatus
              myScore={myScore}
              opponentScore={opponentScore}
              totalPieces={totalPieces}
            />
            <div className="text-sm text-gray-600">
              あなたの完成数：{myScore} / {totalPieces}
              {opponentScore !== null && `　|　相手：${opponentScore} / ${totalPieces}`}
            </div>
          </>
        )}
      </div>
    </div>
  );
}