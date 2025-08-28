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
  totalPieces = 25
}: GameStatusProps) {

  // 残り時間をフォーマット
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // スコア取得
  const myScore = self?.teamId ? (score?.placedByTeam[self.teamId] || 0) : 0;
  const opponentScore = partner?.teamId ? (score?.placedByTeam[partner.teamId] || 0) : 0;

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
    <div className="w-full space-y-4">
      {/* ステータスとタイマー */}
      <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border">
        {/* ステータス */}
        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${status.color} ${status.bgColor}`}>
          {status.text}
        </div>

        {/* タイマー */}
        {remainingTimeMs !== null ? (
          <div className={`text-2xl font-bold ${isTimeRunningOut ? 'text-red-500 animate-pulse' : 'text-gray-800'}`}>
            ⏰ {formatTime(remainingTimeMs)}
          </div>
        ) : started ? (
          <div className="text-lg text-gray-500">時間情報を取得中...</div>
        ) : (
          <div className="text-lg text-gray-400">開始前</div>
        )}
      </div>

      {/* スコア表示 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 自チームスコア */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-center">
            <h3 className="text-sm font-semibold text-blue-700 mb-2">
              🏃 自チーム {self?.teamId ? `(${self.teamId})` : ''}
            </h3>
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {myScore}/{totalPieces}
            </div>
            <div className="text-xs text-blue-600">
              進捗: {myProgress}%
            </div>
            {/* プログレスバー */}
            <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${myProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* 相手チームスコア */}
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="text-center">
            <h3 className="text-sm font-semibold text-red-700 mb-2">
              🚀 相手チーム {partner?.teamId ? `(${partner.teamId})` : ''}
            </h3>
            <div className="text-3xl font-bold text-red-600 mb-1">
              {opponentScore}/{totalPieces}
            </div>
            <div className="text-xs text-red-600">
              進捗: {opponentProgress}%
            </div>
            {/* プログレスバー */}
            <div className="w-full bg-red-200 rounded-full h-2 mt-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${opponentProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 勝敗状況 */}
      {started && (
        <div className="text-center text-sm">
          {myScore > opponentScore && (
            <span className="text-blue-600 font-semibold">🎯 リード中！</span>
          )}
          {myScore < opponentScore && (
            <span className="text-red-600 font-semibold">⚡ 追い上げよう！</span>
          )}
          {myScore === opponentScore && (
            <span className="text-yellow-600 font-semibold">⚖️ 互角の勝負</span>
          )}
        </div>
      )}

      {/* 警告メッセージ */}
      {isTimeRunningOut && (
        <div className="text-center text-red-600 font-bold animate-bounce">
          ⚠️ 残り時間わずか！
        </div>
      )}
    </div>
  );
}