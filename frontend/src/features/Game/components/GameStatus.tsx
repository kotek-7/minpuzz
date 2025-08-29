"use client";

import React from "react";

interface GameStatusProps {
  score: { placedByTeam: Record<string, number> } | null;
  remainingTimeMs: number | null;
  matchStatus: "PREPARING" | "READY" | "IN_GAME" | "COMPLETED" | "UNKNOWN";
  started: boolean;
  self?: { teamId: string; memberCount?: number } | null;
  partner?: { teamId: string; memberCount?: number } | null;
  totalPieces?: number;
}

export default function GameStatus({
  score,
  remainingTimeMs,
  matchStatus,
  started,
  self,
  partner,
  totalPieces = 25,
}: GameStatusProps) {
  // 残り時間をフォーマット
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // スコア取得
  const myScore = self?.teamId ? score?.placedByTeam[self.teamId] || 0 : 0;
  const opponentScore = partner?.teamId ? score?.placedByTeam[partner.teamId] || 0 : 0;

  // 進捗率計算
  const myProgress = Math.round((myScore / totalPieces) * 100);
  const opponentProgress = Math.round((opponentScore / totalPieces) * 100);

  // ステータス表示
  const getStatusDisplay = () => {
    switch (matchStatus) {
      case "PREPARING":
        return { text: "準備中", color: "text-yellow-600", bgColor: "bg-yellow-100" };
      case "READY":
        return { text: "開始待ち", color: "text-blue-600", bgColor: "bg-blue-100" };
      case "IN_GAME":
        return { text: "ゲーム中", color: "text-green-600", bgColor: "bg-green-100" };
      case "COMPLETED":
        return { text: "終了", color: "text-gray-600", bgColor: "bg-gray-100" };
      default:
        return { text: "不明", color: "text-gray-600", bgColor: "bg-gray-100" };
    }
  };

  const status = getStatusDisplay();
  const isTimeRunningOut = remainingTimeMs !== null && remainingTimeMs < 30000; // 30秒切った

  return (
    <div className="w-full space-y-2">
      {/* スコア表示 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 自チームスコア */}
        <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
          <div className="text-center">
            <h3 className="text-xs font-semibold text-blue-700">
              🏃 自チーム 
            </h3>
            <div className="text-sm font-bold text-blue-600">
              {myScore}/{totalPieces}
            </div>
          </div>
        </div>

        {/* 相手チームスコア */}
        <div className="bg-red-50 p-2 rounded-lg border border-red-200">
          <div className="text-center">
            <h3 className="text-xs font-semibold text-red-700">
              🚀 相手チーム 
            </h3>
            <div className="text-sm font-bold text-red-600">
              {opponentScore}/{totalPieces}
            </div>
          </div>
        </div>
      </div>

      {/* 勝敗状況 */}
      {started && (
        <div className="text-center text-sm">
          {myScore > opponentScore && <span className="text-blue-600 font-semibold">🎯 リード中！</span>}
          {myScore < opponentScore && <span className="text-red-600 font-semibold">⚡ 追い上げよう！</span>}
          {myScore === opponentScore && <span className="text-yellow-600 font-semibold">⚖️ 互角の勝負</span>}
        </div>
      )}

      {/* 警告メッセージ */}
      {isTimeRunningOut && <div className="text-center text-red-600 font-bold animate-bounce">⚠️ 残り時間わずか！</div>}
    </div>
  );
}
